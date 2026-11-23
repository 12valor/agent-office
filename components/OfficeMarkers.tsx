'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { createContext, useContext, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { Vector3 } from 'three';
import type { Group } from 'three';
import type { Session } from './telemetry';

type MarkerProps = {
  at: [number, number, number];
  label: string;
  onClick: () => void;
  session?: Session;
  animation?: string;
  speech?: string;
  outfit?: string;
};

function createAnchor() {
  let element: HTMLDivElement | null = null;
  let transform = '';
  let visible = false;
  let depth = 0;
  function apply() {
    if (!element) return;
    element.style.visibility = visible ? 'visible' : 'hidden';
    element.style.transform = transform;
    element.style.zIndex = String(depth);
  }
  return {
    attach(node: HTMLDivElement | null) { element = node; apply(); },
    move(point: Vector3, width: number, height: number) {
      const x = Math.round((point.x + 1) * width / 2);
      const y = Math.round((1 - point.y) * height / 2);
      const next = `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
      const inView = point.z >= -1 && point.z <= 1 && x >= 0 && y >= 0 && x <= width && y <= height;
      const order = Math.round((1 - point.z) * 100);
      if (next === transform && inView === visible && order === depth) return;
      transform = next;
      visible = inView;
      depth = order;
      apply();
    },
  };
}

type Entry = Pick<MarkerProps, 'label' | 'onClick' | 'animation' | 'speech' | 'outfit'> & {
  id: string;
  sessionId?: string;
  state?: string;
  attach: ReturnType<typeof createAnchor>['attach'];
};

export function createMarkerStore() {
  let entries: Entry[] = [];
  const listeners = new Set<() => void>();
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => entries,
    set(entry: Entry) {
      const index = entries.findIndex(({id}) => id === entry.id);
      entries = index === -1 ? [...entries, entry] : entries.map((value,i) => i === index ? entry : value);
      listeners.forEach(listener => listener());
    },
    remove(id: string) {
      entries = entries.filter(entry => entry.id !== id);
      listeners.forEach(listener => listener());
    },
  };
}

type MarkerStore = ReturnType<typeof createMarkerStore>;
export const MarkerLayer = createContext<MarkerStore | null>(null);

export function Marker({ at, label, onClick, session, animation, speech, outfit }: MarkerProps) {
  const store = useContext(MarkerLayer);
  const id = useId();
  const group = useRef<Group>(null);
  const [anchor] = useState(createAnchor);
  const [projected] = useState(() => new Vector3());
  const invalidate = useThree(state => state.invalidate);
  const sessionId = session?.id;
  const state = session?.state;

  useEffect(() => {
    store?.set({id,label,onClick,sessionId,state,animation,speech,outfit,attach:anchor.attach});
    invalidate();
  }, [store,id,label,onClick,sessionId,state,animation,speech,outfit,anchor,invalidate]);
  useEffect(() => () => store?.remove(id), [store,id]);

  useFrame(({ camera, size }) => {
    if (!group.current) return;
    group.current.getWorldPosition(projected).project(camera);
    anchor.move(projected,size.width,size.height);
  });
  return <group ref={group} position={at} />;
}

function RobotSpeech({ line }: { line: string }) {
  const [index, setIndex] = useState(0);
  const lines = [
    'In this town, no one else works harder than me.',
    line,
    'In this town, everyone goes to party except me.',
  ];
  useEffect(() => {
    const timer = window.setInterval(() => setIndex(previous => (previous + 1) % 3), 5000);
    return () => window.clearInterval(timer);
  }, []);
  return <span className="robot-speech" aria-hidden="true">{lines[index]}</span>;
}

function agentTone(state?:string) {
  if(state==='active'||state==='resumed'||state==='recent activity') return 'active';
  if(state==='waiting_for_approval') return 'waiting';
  if(state==='error') return 'error';
  return 'quiet';
}

export function OfficeMarkerOverlay({ store }: { store: MarkerStore }) {
  // The scene supplies positions, while the page owns the DOM and keyboard focus.
  const entries = useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot);
  return <div className="marker-layer">
    {entries.map(entry => <div className="marker-anchor" ref={entry.attach} key={entry.id}>
      {entry.speech && <RobotSpeech line={entry.speech} />}
      <button type="button" className={entry.sessionId ? 'scene-marker agent-tag' : 'scene-marker'} data-session={entry.sessionId} data-state={entry.state} data-animation={entry.animation} data-outfit={entry.outfit} onClick={entry.onClick}>
        {entry.sessionId ? <><span className="agent-tag-dot" data-tone={agentTone(entry.state)} aria-hidden="true" /><span className="agent-tag-name">{entry.label}</span></> : entry.label}
      </button>
    </div>)}
  </div>;
}
