'use client';
import dynamic from 'next/dynamic';
import { Check, CircleHelp, History, Layers, RotateCcw, Settings2 } from 'lucide-react';
import Image from 'next/image';
import type { ButtonHTMLAttributes } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OfficePanel } from '../components/OfficePanel';
import { seated, working } from '../components/telemetry';
import type { Session, Snapshot, Target } from '../components/telemetry';
import { defaultOfficeTheme, officeThemes, readOfficeTheme, themeStorageKey } from '../components/officeThemes';
import type { OfficeThemeId } from '../components/officeThemes';

const Office = dynamic(() => import('../components/Office'), { ssr: false, loading: () => <p className="scene-message">Opening the office…</p> });
const empty: Session[] = [];

const connectionLabels = {
  connecting: 'Connecting to monitor',
  connected: 'Monitor connected',
  reconnecting: 'Reconnecting to monitor',
  disconnected: 'Monitor disconnected',
} as const;

function OfficeControl({ label, children, ...button }: ButtonHTMLAttributes<HTMLButtonElement> & {label: string}) {
  const [dismissed, setDismissed] = useState(false);
  return <span className="control" onPointerLeave={() => setDismissed(false)}>
    <button {...button} type="button" className="office-control" aria-label={label}
      onBlur={() => setDismissed(false)} onKeyDown={event => {
        if (event.key === 'Escape') setDismissed(true);
      }} onClick={event => {setDismissed(true);button.onClick?.(event);}}>
      {children}
    </button>
    {!dismissed && <span className="control-tip" aria-hidden="true">{label}</span>}
  </span>;
}

export default function Page() {
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [connection, setConnection] = useState<keyof typeof connectionLabels>('connecting');
  const connected = connection === 'connected';
  const [target, setTarget] = useState<Target>();
  const [reset, setReset] = useState(0);
  const [motionPaused, setMotionPaused] = useState(false);
  const [theme,setTheme]=useState<OfficeThemeId>(defaultOfficeTheme);
  const [themeError,setThemeError]=useState('');
  const [changeCount,setChangeCount]=useState(0);
  const themeRequest=useRef(0);
  const picker=useRef<HTMLDivElement>(null);
  const chooseTheme=useCallback(async (next:OfficeThemeId, save:boolean)=>{
    const request=++themeRequest.current;
    try {
      await officeThemes[next].load?.();
      if(request!==themeRequest.current) return;
      setTheme(next);
      setThemeError('');
      if(save) {
        try {localStorage.setItem(themeStorageKey,next);} catch { /* Storage is optional. */ }
        setChangeCount(count=>count+1);
        picker.current?.hidePopover();
      }
    } catch {
      if(request===themeRequest.current) setThemeError('The environment could not load. Try again.');
    }
  },[]);
  useEffect(()=>{
    const restore=window.setTimeout(()=>{
      if(themeRequest.current) return;
      try {
        const saved=readOfficeTheme(localStorage.getItem(themeStorageKey));
        if(saved!==defaultOfficeTheme) void chooseTheme(saved,false);
      } catch { /* Use the default when storage is unavailable. */ }
    },0);
    return ()=>window.clearTimeout(restore);
  },[chooseTheme]);
  useEffect(() => {
    const stream = new EventSource('http://127.0.0.1:4318/events');
    stream.onopen = () => setConnection('connected');
    stream.onerror = () => setConnection(stream.readyState === EventSource.CONNECTING ? 'reconnecting' : 'disconnected');
    const rested = new Set<string>();
    stream.onmessage = event => {
      const next = JSON.parse(event.data) as Snapshot;
      const sessions = next.sessions.map(session => {
        if (session.state === 'completed' || session.state === 'idle') rested.add(session.id);
        else if (session.state !== 'unknown') rested.delete(session.id);
        // Visual continuity after a confirmed end doesn't change the inspector's status.
        if (session.state === 'unknown' && rested.has(session.id)) return {...session,resting:true};
        return session;
      });
      for (const id of rested) if (!sessions.some(session=>session.id===id)) rested.delete(id);
      setSnapshot({...next,sessions});
    };
    return () => stream.close();
  }, []);
  const sessions = snapshot?.sessions ?? empty;
  const count = sessions.filter(session => working(session.state)).length;
  const workers = useMemo(() => sessions.filter(session => seated(session.state) || session.resting)
    .sort((a,b) => Number(!!a.resting)-Number(!!b.resting) || Number(b.isWsb)-Number(a.isWsb) || Number(working(b.state))-Number(working(a.state)))
    .slice(0,9), [sessions]);

  return <main className="office" aria-label="Agent Office" data-theme={theme} style={{'--theme-backdrop':officeThemes[theme].backdrop ?? undefined} as React.CSSProperties}>
    <Office workers={workers} connected={connected} onSelect={setTarget} reset={reset} selected={target} motionPaused={motionPaused} theme={theme} />
    {!motionPaused && changeCount>0 && <div className="theme-transition" key={changeCount} aria-hidden="true" />}
    <header className="office-header">
      <div className="controls">
        <span className="connection" role="status" data-connection={connection}>
          <i aria-hidden="true" />{connectionLabels[connection]}
        </span>
        <div className="toolbar-actions" role="group" aria-label="Office controls">
          <OfficeControl label="Office themes" popoverTarget="office-theme-picker"><Layers aria-hidden="true" /></OfficeControl>
          <OfficeControl label="Session history" onClick={() => setTarget({kind:'history'})}><History aria-hidden="true" /></OfficeControl>
          <OfficeControl label="Settings" onClick={() => setTarget({kind:'settings'})}><Settings2 aria-hidden="true" /></OfficeControl>
        </div>
        <div id="office-theme-picker" className="theme-picker" popover="auto" ref={picker}>
          <h2>Environment</h2>
          {Object.entries(officeThemes).map(([id,item])=><button type="button" key={id} className="theme-choice" aria-pressed={id===theme} onClick={()=>void chooseTheme(id as OfficeThemeId,true)}>
            <Image src={item.preview} alt="" width={86} height={50} unoptimized />
            <span><strong>{item.label}</strong><small>{item.caption}</small></span>
            {id===theme && <Check size={15} aria-hidden="true" />}
          </button>)}
          {themeError && <p role="status">{themeError}</p>}
        </div>
      </div>
    </header>
    <footer className="office-footer">
      <div className="floor-status"><i data-connected={connected && count > 0} /><span>{!connected ? 'Live status unavailable' : count === 0 ? 'No recent activity' : `${count} ${count === 1 ? 'session' : 'sessions'} with recent activity`}</span></div>
      <div className="camera" role="group" aria-label="Camera">
        <button type="button" className="camera-hint" aria-label="Camera controls" popoverTarget="camera-help">
          <span className="camera-hint-text" aria-hidden="true">Orbit <b>·</b> Zoom <b>·</b> Pan</span>
          <CircleHelp aria-hidden="true" />
        </button>
        <div id="camera-help" className="camera-help" popover="auto">
          <h2>Camera controls</h2>
          <dl>
            <div><dt>Orbit</dt><dd>Drag</dd></div>
            <div><dt>Zoom</dt><dd>Scroll or pinch</dd></div>
            <div><dt>Pan</dt><dd>Right-drag or two-finger drag</dd></div>
          </dl>
        </div>
        <OfficeControl label="Reset camera" onClick={() => setReset(n => n + 1)}><RotateCcw aria-hidden="true" /></OfficeControl>
      </div>
    </footer>
    {target && <OfficePanel target={target} snapshot={snapshot} connected={connected} onSelect={setTarget} close={() => setTarget(undefined)} motionPaused={motionPaused} toggleMotion={() => setMotionPaused(value=>!value)} />}
  </main>;
}
