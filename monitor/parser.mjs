import path from 'node:path';

export function normalize(p) {
  if (!p || typeof p !== 'string') return '';
  const value = path.resolve(p).replace(/[\\/]+/g, '/').replace(/\/$/, '');
  return process.platform === 'win32' ? value.toLowerCase() : value;
}
export function belongs(cwd, root) {
  const c = normalize(cwd), r = normalize(root);
  return !!r && (c === r || c.startsWith(r + '/'));
}
export function deduplicate(sessions) {
  const byId = new Map();
  for (const session of sessions) {
    const previous = byId.get(session.id);
    if (!previous || String(session.last).localeCompare(String(previous.last)) > 0) byId.set(session.id, session);
  }
  return [...byId.values()].sort((a,b) => String(b.last).localeCompare(String(a.last)));
}
const numeric = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : 0;
const allowedTools = new Set(['exec_command', 'write_stdin', 'apply_patch', 'view_image', 'web__run']);
const event = (s, at, type, detail) => {
  s.events = [...(s.events || []), {at, type, detail}].slice(-30);
};
function classify(command) {
  const parts = Array.isArray(command) ? command : typeof command === 'string' ? command.trim().split(/\s+/) : [];
  const binary = typeof parts[0] === 'string' ? parts[0].toLowerCase().replace(/\.cmd$/, '') : '';
  const action = parts[1] === 'run' ? parts[2] : parts[1];
  if (/^(npm|pnpm|yarn|bun)$/.test(binary)) {
    if (/^(test|test:e2e|lint|typecheck)$/.test(action)) return 'Testing';
    if (action === 'build') return 'Building';
    if (action === 'deploy') return 'Deployment';
  }
  if (binary === 'git' && /^(status|diff|log|fetch|pull|push)$/.test(action)) return 'Repository';
  if (binary === 'pytest' || binary === 'vitest' || (binary === 'node' && action === '--test')) return 'Testing';
  return null;
}
export function apply(s, record) {
  const p = record?.payload || {}, t = record?.timestamp;
  if (typeof t !== 'string' || !Number.isFinite(Date.parse(t))) return s;
  s.last = t;
  if (record.type === 'session_meta') {
    s.id = p.id || p.session_id; s.cwd = p.cwd; s.started = p.timestamp || t; s.branch = p.git?.branch || null;
  }
  if (record.type === 'turn_context') { s.model = p.model || s.model; s.cwd = p.cwd || s.cwd; }
  if (record.type === 'event_msg') {
    if (p.type === 'task_started' || p.type === 'turn_started') {
      if (!p.turn_id || s.turnId !== p.turn_id) {
        s.resumed = Boolean(s.turnStarted || s.phase);
        s.turnId = p.turn_id;
        s.turnStarted = t;
        s.phase = 'working';
        s.activity = 'Analyzing';
        event(s,t,'Turn',s.resumed ? 'Resumed' : 'Started');
      }
    }
    if (p.type === 'task_complete' || p.type === 'turn_complete' || p.type === 'turn_aborted') {
      s.phase = p.type === 'turn_aborted' ? 'aborted' : 'completed';
      s.turnEnded = t;
      delete s.activity;
      event(s,t,'Turn',p.type === 'turn_aborted' ? 'Aborted' : 'Completed');
    }
    if (p.type === 'exec_approval_request' || p.type === 'apply_patch_approval_request') {
      s.activity = 'Waiting for approval';
      event(s,t,'Approval','Approval requested');
    }
    if (p.type === 'exec_command_begin' || p.type === 'exec_command_end') {
      const activity = classify(p.command);
      if (activity) {
        s.activity = p.type === 'exec_command_begin' ? activity : 'Analyzing';
        const detail = p.type === 'exec_command_begin' ? 'Started' : Number.isInteger(p.exit_code) ? `Exit code ${p.exit_code}` : 'Ended';
        event(s,t,activity,detail);
      }
    }
    if (p.type === 'error') {
      s.activity = 'Error';
      event(s,t,'Error','Codex reported an error');
    }
    if (p.type === 'token_count' && p.info?.total_token_usage) {
      const u = p.info.total_token_usage, previous = numeric(s.usage?.total_tokens);
      const next = numeric(u.total_tokens);
      s.usage = Object.fromEntries(['input_tokens','cached_input_tokens','output_tokens','reasoning_output_tokens','total_tokens'].map(k => [k, numeric(u[k])]));
      // Cumulative snapshots are converted into non-negative deltas only once per record.
      if (next >= previous) { const day = t.slice(0, 10); s.daily ||= {}; s.daily[day] = (s.daily[day] || 0) + next - previous; }
      s.context = numeric(p.info.last_token_usage?.total_tokens);
      s.window = numeric(p.info.model_context_window);
    }
    if (p.type === 'token_count' && p.rate_limits) {
      const window = w => w && typeof w.used_percent === 'number' && Number.isFinite(w.used_percent) && typeof w.window_minutes === 'number' && Number.isFinite(w.window_minutes) && typeof w.resets_at === 'number' && Number.isFinite(w.resets_at) ? {used_percent: w.used_percent, window_minutes: w.window_minutes, resets_at: w.resets_at} : null;
      s.limits = {primary: window(p.rate_limits.primary), secondary: window(p.rate_limits.secondary), observedAt: t};
    }
    if (p.type === 'context_compacted') s.compactions = (s.compactions || 0) + 1;
  }
  if (record.type === 'response_item' && /tool_call$|function_call$/.test(p.type || '')) {
    const name = allowedTools.has(p.name) ? p.name : 'Tool activity';
    s.operation = name;
    if (name === 'apply_patch') s.activity = 'Coding';
    if (name === 'exec_command' || /(?:^|__)exec_command$/.test(p.name || '')) {
      try {
        const toolInput = p.arguments ?? p.input;
        const {cmd} = typeof toolInput === 'string' ? JSON.parse(toolInput) : toolInput ?? {};
        const activity = classify(cmd);
        if (activity) {
          s.activity = activity;
          event(s,t,activity,'Command requested');
        }
      } catch { /* Unsupported command payload. */ }
    }
    event(s,t,'Tool activity',name);
  }
  if (record.type === 'response_item' && /(?:function_call|custom_tool_call)_output$/.test(p.type || '') &&
      /^(Coding|Testing|Building|Deployment|Repository)$/.test(s.activity || '')) {
    s.activity = 'Analyzing';
  }
  return s;
}
export function state(s, now = Date.now()) {
  if (!s.phase) return s.id ? 'discovered' : 'unknown';
  const age = now - Date.parse(s.last || '');
  if (!Number.isFinite(age) || age < 0 || age > 120000) return 'unknown';
  if (s.phase === 'completed' || s.phase === 'aborted') {
    const sinceEnd = now - Date.parse(s.turnEnded || s.last);
    return sinceEnd >= 0 && sinceEnd <= 12000 ? 'completed' : 'unknown';
  }
  if (s.phase !== 'working') return 'unknown';
  if (s.activity === 'Waiting for approval') return 'waiting_for_approval';
  if (s.activity === 'Error') return 'error';
  return s.resumed ? 'resumed' : 'active';
}
