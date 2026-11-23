'use client';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { CanvasTexture, SRGBColorSpace, Vector3 } from 'three';
import type { Group, Mesh } from 'three';
import { date, number, project, stateLabel } from './telemetry';
import type { Session } from './telemetry';

export const faceTabs = ['Status','Token Usage','Activity'] as const;
export type FaceTab = typeof faceTabs[number];
export function createFaceTarget() {
  let head:Group|null=null, amount=0;
  const direction=new Vector3(0,.1,1);
  return {
    get head(){return head;},get amount(){return amount;},direction,
    setHead(value:Group|null){head=value;},setAmount(value:number){amount=value;},
  };
}
export type FaceTarget = ReturnType<typeof createFaceTarget>;

export function faceReadings(session:Session, tab:FaceTab, connected:boolean):[string,string][] {
  if(tab==='Token Usage') return [
    ['Total',number(session.usage?.total_tokens)],['Input',number(session.usage?.input_tokens)],
    ['Output',number(session.usage?.output_tokens)],['Cached input',number(session.usage?.cached_input_tokens)],
  ];
  if(tab==='Activity') {
    const duration=(Date.parse(session.last)-Date.parse(session.started))/60000;
    return [
      ['Operation',session.operation ?? session.activity ?? 'Unavailable'],
      ['Recorded duration',Number.isFinite(duration)&&duration>=0?`${Math.floor(duration/60)}h ${Math.floor(duration%60)}m`:'Unavailable'],
      ['Last activity',date(session.last)],
    ];
  }
  return [
    ['Session',session.name || session.id],['Model',session.model ?? 'Unavailable'],
    ['Activity',session.activity ?? 'Unavailable'],['State',connected?stateLabel(session):'Monitor disconnected'],
    ['Project',project(session)],
  ];
}

export function RobotFace({ session, tab, connected, target }: {session:Session; tab:FaceTab; connected:boolean; target:FaceTarget}) {
  const display=useRef<Mesh>(null);
  const scan=useRef<Mesh>(null);
  const [surface]=useState(()=>{
    const canvas=document.createElement('canvas');
    canvas.width=960;canvas.height=560;
    const map=new CanvasTexture(canvas);
    map.colorSpace=SRGBColorSpace;
    return {canvas,map,refresh:()=>{map.needsUpdate=true;}};
  });
  useEffect(()=>{
    const {canvas}=surface;
    const ctx=canvas.getContext('2d')!;
    ctx.fillStyle='#0d2430';ctx.fillRect(0,0,960,560);
    ctx.strokeStyle='#448b86';ctx.lineWidth=5;ctx.strokeRect(12,12,936,536);
    ctx.fillStyle='#a2e8d1';ctx.font='700 52px system-ui';ctx.fillText(tab,43,78);
    ctx.strokeStyle='#315c61';ctx.beginPath();ctx.moveTo(43,108);ctx.lineTo(914,108);ctx.stroke();
    faceReadings(session,tab,connected).forEach(([key,value],i)=>{
      const y=169+i*76;
      ctx.font='500 35px system-ui';ctx.fillStyle='#a4c5c8';ctx.fillText(key,43,y);
      ctx.font='650 35px system-ui';ctx.fillStyle='#eefbf7';
      let fitted=value;
      while(fitted.length>1 && ctx.measureText(fitted).width>568) fitted=fitted.slice(0,-2)+'…';
      ctx.fillText(fitted,335,y);
    });
    surface.refresh();
  },[session,tab,connected,surface]);
  useEffect(()=>()=>surface.map.dispose(),[surface]);
  useFrame(()=>{
    const amount=target.amount;
    if(display.current) display.current.visible=amount>=.93;
    if(scan.current) {
      scan.current.visible=amount>.24 && amount<.93;
      scan.current.position.y=.12-((amount-.24)/.69)*.22;
    }
  });
  return <>
    <mesh ref={display} visible={false} position={[0,0,.285]}>
      <planeGeometry args={[.65,.385]} /><meshBasicMaterial map={surface.map} toneMapped={false} />
    </mesh>
    <mesh ref={scan} visible={false} position={[0,0,.287]}>
      <planeGeometry args={[.54,.018]} /><meshBasicMaterial color="#a0eddb" transparent opacity={.76} toneMapped={false} />
    </mesh>
  </>;
}
