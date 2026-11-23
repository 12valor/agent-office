'use client';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { date, number, project, stateLabel, working } from './telemetry';
import type { Snapshot, Target, Usage } from './telemetry';

const titles = { agent:'Agent session', monitor:'Workstation activity', usage:'Codex usage', compute:'Compute rack', tests:'Test bench', deploy:'Deployment station', settings:'Office settings', history:'Session history' };
function Rows({ items }: {items: [string, string | number][]}) {
  return <dl>{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function OfficePanel({ target, snapshot, connected, onSelect, close, motionPaused, toggleMotion }: { target: Target; snapshot?: Snapshot; connected: boolean; onSelect: (target: Target) => void; close: () => void; motionPaused:boolean; toggleMotion:()=>void }) {
  const frame = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const outside = useRef(false);
  useEffect(() => {
    const dialog = frame.current;
    dialog?.showModal();
    closeButton.current?.focus();
    return () => dialog?.close();
  }, []);
  const [path, setPath] = useState<string>();
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const sessions = snapshot?.sessions ?? [];
  const session = sessions.find(item => item.id === target.id);
  const usageSession = [...sessions].filter(item => item.limits).sort((a,b) => (b.limits?.observedAt ?? '').localeCompare(a.limits?.observedAt ?? ''))[0];
  const context = sessions.find(item => item.context != null && item.window);
  const days: Record<string, number> = {};
  for (const item of sessions) for (const [day, value] of Object.entries(item.daily ?? {})) days[day] = (days[day] ?? 0) + value;
  const clock = snapshot?.now ? Date.parse(snapshot.now) : 0;
  const today = new Date(clock).toISOString().slice(0,10);
  const weekStart = new Date(clock - 6 * 86400000).toISOString().slice(0,10);
  const observed = Object.entries(days).filter(([day]) => day >= weekStart && day <= today);
  const peak = Math.max(1,...observed.map(([,value])=>value));
  const metric = (key: keyof Usage) => {
    const samples = sessions.flatMap(item => item.usage?.[key] == null ? [] : [item.usage[key]]);
    return samples.length ? number(samples.reduce((a,b) => a+b, 0)) : 'Unavailable';
  };
  const events = (session ? session.events ?? [] : sessions.flatMap(item => item.events ?? []))
    .filter(event => target.kind === 'tests' ? /test|build/i.test(event.type) : target.kind === 'deploy' ? /deploy|build|repository/i.test(event.type) : true)
    .sort((a,b) => b.at.localeCompare(a.at)).slice(0,16);
  const age = session ? (Date.parse(session.last) - Date.parse(session.started)) / 60000 : NaN;
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const result = await fetch('http://127.0.0.1:4318/settings', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({path:path ?? snapshot?.wsbPath}) });
      setMessage(result.ok ? 'Repository saved' : await result.text());
      if (result.ok) setPath(undefined);
    } catch { setMessage('Monitor connection unavailable'); }
    finally { setSaving(false); }
  }

  function beyondPanel(event: React.PointerEvent) {
    if (event.target !== frame.current) return false;
    const bounds = frame.current.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  }
  const eventList = events.length ? <ol className="events">{events.map((event,i) => <li key={i}><strong>{event.type}</strong><span>{event.detail}</span><time dateTime={event.at}>{date(event.at)}</time></li>)}</ol> : <p>No matching events are available from the local monitor.</p>;
  return <dialog ref={frame} className="object-panel" aria-labelledby="object-title" onClose={() => {if (!frame.current?.open) close();}} onPointerDown={event => {outside.current = beyondPanel(event);}} onPointerUp={event => {if (outside.current && beyondPanel(event)) frame.current?.close(); outside.current=false;}}>
    <div className="panel-header"><h2 id="object-title">{target.kind === 'agent' && session ? session.name || project(session) : titles[target.kind]}</h2><button ref={closeButton} type="button" aria-label="Close details" onClick={() => frame.current?.close()}><X size={16} /></button></div>
    {target.kind === 'agent' && (session ? <><Rows items={[
      ['Session',session.name ?? session.id], ['Repository',project(session)],
      ['Status', connected ? stateLabel(session) : 'Monitor disconnected'],
      ['Operation', connected && working(session.state) ? session.activity ?? session.operation ?? 'Turn in progress' : '—'],
      ['Model',session.model ?? 'Unavailable'], ['Branch',session.branch ?? 'Unavailable'],
      ['Recorded duration',Number.isFinite(age) && age >= 0 ? `${Math.floor(age / 60)}h ${Math.floor(age % 60)}m` : 'Unavailable'],
      ['Input tokens',number(session.usage?.input_tokens)], ['Output tokens',number(session.usage?.output_tokens)], ['Last activity',date(session.last)],
      ['Status source',session.source ?? 'Recorded Codex events'],
    ]} /><details><summary>Recent events</summary>{eventList}</details></> : <p>Session details are unavailable.</p>)}
    {['monitor','tests','deploy'].includes(target.kind) && eventList}
    {target.kind === 'usage' && <><Rows items={[
      ['Total tokens',metric('total_tokens')], ['Input tokens',metric('input_tokens')], ['Output tokens',metric('output_tokens')], ['Cached input',metric('cached_input_tokens')],
      ['Reasoning tokens',metric('reasoning_output_tokens')], ['Today (UTC)',number(days[today])], ['Last 7 days (UTC)',observed.length ? number(observed.reduce((a,[,v]) => a+v,0)) : 'Unavailable'],
      ['Last reported context',context ? `${number(context.context)} / ${number(context.window)}` : 'Unavailable'],
    ]} />{observed.length > 0 && <section className="trend" aria-label="Observed daily token totals for the last seven days"><h3>Daily consumption</h3>{observed.sort(([a],[b])=>a.localeCompare(b)).map(([day,value])=><div key={day}><time dateTime={day}>{day.slice(5)}</time><span className="trend-track"><span style={{width:`${value/peak*100}%`}} /></span><span>{number(value)}</span></div>)}</section>}
    <details><summary>Daily history (UTC)</summary><Rows items={Object.entries(days).sort(([a],[b])=>b.localeCompare(a)).map(([day,value])=>[day,number(value)])} /></details>
    <button className="text-action" onClick={() => onSelect({kind:'history'})}>Session history</button><h3>Account limits</h3><Rows items={[300,10080].map(minutes => {
      const limit = [usageSession?.limits?.primary, usageSession?.limits?.secondary].find(row => row?.window_minutes === minutes);
      return [minutes === 300 ? 'Five-hour window' : 'Weekly window',limit ? `${limit.used_percent}% used · resets ${date(limit.resets_at * 1000)}` : 'Unavailable'];
    })} /><p className="panel-note">Limit snapshot recorded {date(usageSession?.limits?.observedAt)}. Token counters and account limits measure different things.</p></>}
    {target.kind === 'compute' && <Rows items={[
      ['System CPU',snapshot?.host?.cpu == null ? 'Unavailable' : `${snapshot.host.cpu}%`],
      ['System RAM',snapshot?.host ? `${snapshot.host.ram}% of ${(snapshot.host.totalMemory / 2 ** 30).toFixed(1)} GiB` : 'Unavailable'],
      ['Machine',snapshot?.host ? `${snapshot.host.platform} · ${snapshot.host.architecture} · ${snapshot.host.cores} logical cores` : 'Unavailable'],
      ['Agent process metrics','Unavailable'],
    ]} />}
    {target.kind === 'history' && (sessions.length ? <ul className="history">{sessions.map(item => <li key={item.id}><button onClick={() => onSelect({kind:'agent',id:item.id})}><strong>{item.name || project(item)}</strong><span>{stateLabel(item)} · {date(item.last)}</span></button></li>)}</ul> : <p>No recorded sessions yet.</p>)}
    {target.kind === 'settings' && <><form onSubmit={save}><label htmlFor="repo">Web System Builders repository</label><input id="repo" value={path ?? snapshot?.wsbPath ?? ''} onChange={event => setPath(event.target.value)} required /><button className="primary-action" type="submit" disabled={saving || !connected}>{saving ? 'Saving…' : 'Save repository'}</button><p role="status">{message}</p></form><Rows items={[[ 'Adapter',snapshot?.diagnostic ?? 'Waiting for monitor' ],[ 'Codex home',snapshot?.codexHomeFound ? 'Found' : 'Unavailable' ]]} /></>}
    {target.kind === 'settings' && <button className="text-action" type="button" onClick={toggleMotion}>{motionPaused ? 'Resume office motion' : 'Pause office motion'}</button>}
  </dialog>;
}
