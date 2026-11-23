export type Usage = {
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens: number;
  reasoning_output_tokens: number;
  total_tokens: number;
};
export type Limit = { used_percent: number; window_minutes: number; resets_at: number };
export type Event = { at: string; type: string; detail: string };
export type Session = {
  id: string; cwd: string; started: string; last: string; state: string; isWsb: boolean;
  name?: string; source?: string; model?: string; branch?: string; operation?: string; activity?: string; turnEnded?:string;
  phase?:string; resting?:boolean;
  usage?: Usage; context?: number; window?: number; daily?: Record<string, number>; events?: Event[];
  limits?: { primary: Limit | null; secondary: Limit | null; observedAt: string };
};
export type Snapshot = {
  sessions: Session[]; wsbPath: string; diagnostic: string; codexHomeFound: boolean; now?: string;
  host?: { cpu: number | null; ram: number; totalMemory: number; cores: number; platform: string; architecture: string };
};
export type Target = { kind: 'agent' | 'monitor' | 'usage' | 'compute' | 'tests' | 'deploy' | 'settings' | 'history'; id?: string };
export const project = (s: Session) => s.isWsb ? 'Web System Builders' : s.cwd.split(/[\\/]/).filter(Boolean).pop() || 'Unknown project';
export const number = (n?: number) => n == null ? 'Unavailable' : new Intl.NumberFormat().format(n);
export const date = (value?: string | number) => value != null && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleString() : 'Unavailable';
export const working = (state: string) => ['active','resumed','recent activity'].includes(state);
export const seated = (state: string) => working(state) || ['idle','completed','turn completed','waiting_for_approval','error'].includes(state);
export function stateLabel(session: Session) {
  const labels: Record<string,string> = {
    active:'Active turn', resumed:'Resumed turn', 'recent activity':'Recent activity', waiting_for_approval:'Waiting for approval',
    completed:'Turn completed', idle:'Idle', error:'Error', disconnected:'Monitor disconnected', discovered:'Discovered', unknown:'Activity unknown',
  };
  return labels[session.state] ?? session.state;
}
