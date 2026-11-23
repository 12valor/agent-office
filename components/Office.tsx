'use client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, RoundedBox, useCursor } from '@react-three/drei';
import { Component, lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BoxGeometry, CanvasTexture, Color, MathUtils, Matrix4, PCFShadowMap, Quaternion, SRGBColorSpace, Vector3 } from 'three';
import type { DirectionalLight, Group, HemisphereLight, MeshStandardMaterial, OrthographicCamera } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { project, working } from './telemetry';
import type { Session, Target } from './telemetry';
import { createMarkerStore, Marker, MarkerLayer, OfficeMarkerOverlay } from './OfficeMarkers';
import { createRobotMotion, legPose, loungeChair, loungeRoute, robotPose, routePosition, stepRobot } from './robotMotion';
import type { AnimationPhase, RestLocation, SeatKind } from './robotMotion';
import { createFaceTarget, faceReadings, faceTabs, RobotFace } from './RobotFace';
import type { FaceTab, FaceTarget } from './RobotFace';
import { RobotOutfit } from './RobotOutfit';
import { HeadquartersShell } from './HeadquartersShell';
import { defaultOfficeTheme, officeThemes } from './officeThemes';
import type { OfficeTheme, OfficeThemeId, OutfitId } from './officeThemes';

type Point = [number, number, number];
const box = new BoxGeometry();
const ink = '#143949', ocean = '#25748a', deep = '#285664', mint = '#7fcdb4', foam = '#e7eee5', oak = '#cfab7e';
const cameraPosition=officeThemes[defaultOfficeTheme].camera.position;
const environments = {
  'standard-office': null,
  'tropical-beach': lazy(officeThemes['tropical-beach'].load),
  'cyberpunk-rooftop': lazy(officeThemes['cyberpunk-rooftop'].load),
  'forest-cabin': lazy(officeThemes['forest-cabin'].load),
  'space-station': lazy(officeThemes['space-station'].load),
};

function Block({ at, size, color, glow = false }: { at: Point; size: Point; color: string; glow?: boolean }) {
  return <mesh position={at} scale={size} castShadow receiveShadow>
    <primitive object={box} attach="geometry" dispose={null} />
    <meshStandardMaterial color={color} roughness={.8} emissive={glow ? color : '#000'} emissiveIntensity={glow ? .35 : 0} />
  </mesh>;
}

function Plant({ at, size = 1 }: { at: Point; size?: number }) {
  const foliage = useRef<Group>(null);
  const sway = useRef(0);
  useFrame((state,dt) => {
    if (!foliage.current || document.hidden) return;
    if(state.frameloop==='always') sway.current+=Math.min(dt,.05);
    foliage.current.rotation.z=state.frameloop==='always'?Math.sin(sway.current*1.15+at[0])*.028:0;
  });
  return <group position={at} scale={size}>
    <mesh position={[0,.22,0]} castShadow><cylinderGeometry args={[.34,.25,.44,8]} /><meshStandardMaterial color="#db936f" /></mesh>
    <group ref={foliage}>
    {[[-.19,.7,.01],[.14,.82,.15],[.07,.98,-.18],[.25,.64,-.13],[-.19,.94,-.09]].map(([x,y,z],i) =>
      <mesh key={i} position={[x,y,z]} rotation={[z,0,-x * 2]} scale={[.22,.51,.2]} castShadow><icosahedronGeometry args={[1,0]} /><meshStandardMaterial color={i % 2 ? '#548b71' : '#84af76'} /></mesh>)}
    </group>
  </group>;
}

function WallSign() {
  const [texture] = useState(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 240;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#205963';
    context.fillRect(0,0,640,240);
    context.fillStyle = '#d7f5e7';
    context.font = '800 116px Segoe UI, sans-serif';
    context.textAlign = 'center';
    context.fillText('WSB',320,136);
    context.font = '600 29px Segoe UI, sans-serif';
    context.letterSpacing = '7px';
    context.fillText('AGENT OFFICE',320,190);
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = 4;
    return map;
  });
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={[0,0,.15]}><planeGeometry args={[3.94,1.51]} /><meshBasicMaterial map={texture} /></mesh>;
}

function OfficeFloor() {
  const [texture] = useState(() => {
    const canvas=document.createElement('canvas');
    canvas.width=1024;
    canvas.height=704;
    const ctx=canvas.getContext('2d')!;
    const shades=['#e2ccaf','#d8c1a6','#e8d6ba','#dec8ad','#e5d0b4'];
    for(let row=0; row<22; row++) {
      for(let column=-1; column<7; column++) {
        const x=column*168+(row%3)*56;
        const y=row*32;
        ctx.fillStyle=shades[(row*7+column+6)%shades.length];
        ctx.fillRect(x,y,168,32);
        ctx.fillStyle='#95755448';
        ctx.fillRect(x,y,168,1);
        ctx.fillRect(x,y,1,32);
        ctx.fillStyle='#f8e4c238';
        ctx.fillRect(x+3,y+7+(row%8),132,1);
        ctx.fillRect(x+32,y+23-(row%7),105,1);
      }
    }
    const map=new CanvasTexture(canvas);
    map.colorSpace=SRGBColorSpace;
    map.anisotropy=4;
    return map;
  });
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <mesh position={[0,.008,0]} rotation={[-Math.PI/2,0,0]} receiveShadow>
    <planeGeometry args={[15.95,11.04]} />
    <meshStandardMaterial map={texture} roughness={.92} />
  </mesh>;
}

function Bookcase() {
  return <group position={[.95,0,-4.88]}>
    <Block at={[0,.92,-.26]} size={[2.34,1.84,.11]} color={deep} />
    {[-1.1,1.1].map(x=><Block key={x} at={[x,.94,0]} size={[.13,1.88,.64]} color={foam} />)}
    {[.10,.68,1.24,1.83].map(y=><Block key={y} at={[0,y,0]} size={[2.33,.09,.65]} color={foam} />)}
    {[.15,.73,1.29].map((y, shelf)=><group key={y}>
      {Array.from({length:5},(_,i)=><Block key={i} at={[-.91+i*.155,y+.13+(i%3)*.028,.05]} size={[.128,.26+(i%3)*.056,.32]} color={[ocean,mint,oak,'#4f7c82'][(i+shelf)%4]} />)}
      <Block at={[.54,y+.15,.025]} size={[.58,.3,.41]} color={shelf===1 ? '#b88b63' : '#93ada6'} />
      <Block at={[.54,y+.19,.237]} size={[.18,.042,.02]} color={ink} />
    </group>)}
    <Plant at={[.69,1.88,0]} size={.38} />
  </group>;
}

function WallClock() {
  const minute=useRef<Group>(null);
  const hour=useRef<Group>(null);
  const second=useRef<Group>(null);
  const last=useRef(-1);
  useFrame(({frameloop})=>{
    if(document.hidden || (frameloop!=='always'&&last.current>=0)) return;
    const stamp=Math.floor(Date.now()/1000);
    if(stamp===last.current) return;
    last.current=stamp;
    const now=new Date(stamp*1000);
    if(minute.current) minute.current.rotation.z=-now.getMinutes()*Math.PI/30;
    if(hour.current) hour.current.rotation.z=-(now.getHours()+now.getMinutes()/60)*Math.PI/6;
    if(second.current) second.current.rotation.z=-now.getSeconds()*Math.PI/30;
  });
  return <group position={[1.12,2.85,-5.22]}>
    <mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.37,.37,.12,20]} /><meshStandardMaterial color={deep} /></mesh>
    <mesh position={[0,0,.065]}><circleGeometry args={[.31,20]} /><meshStandardMaterial color={foam} /></mesh>
    {Array.from({length:12},(_,i)=><group key={i} rotation={[0,0,i*Math.PI/6]}><Block at={[0,.255,.075]} size={[.022,.052,.012]} color={ocean} /></group>)}
    <group ref={hour}><Block at={[0,.069,.087]} size={[.036,.16,.018]} color={deep} /></group>
    <group ref={minute}><Block at={[0,.102,.101]} size={[.025,.215,.018]} color={deep} /></group>
    <group ref={second}><Block at={[0,.109,.115]} size={[.012,.23,.013]} color="#d18c6c" /></group>
  </group>;
}

function LoungeLamp() {
  return <group position={[6.81,0,1.65]}>
    <mesh position={[0,.05,0]} castShadow><cylinderGeometry args={[.23,.27,.10,10]} /><meshStandardMaterial color={deep} /></mesh>
    <Block at={[0,.83,0]} size={[.055,1.62,.055]} color={deep} />
    <mesh position={[0,1.67,0]} castShadow><cylinderGeometry args={[.19,.30,.32,10]} /><meshStandardMaterial color="#e7d5a6" emissive="#d19e62" emissiveIntensity={.18} /></mesh>
  </group>;
}

function Display({ active, color }: { active: boolean; color: string }) {
  const cursor = useRef<Group>(null);
  const screen = useRef<MeshStandardMaterial>(null);
  const elapsed = useRef(0);
  useFrame((state,dt) => {
    if(document.hidden) return;
    const animate=state.frameloop==='always';
    if(animate) elapsed.current += Math.min(dt,.05);
    if (cursor.current) cursor.current.position.y = active && animate ? Math.floor(elapsed.current * 3) % 4 * .088 : 0;
    if (screen.current) screen.current.emissiveIntensity=active ? .17+(animate?.04*Math.sin(elapsed.current*1.8):0) : .018;
  });
  return <>
    <Block at={[0,.12,0]} size={[.31,.24,.14]} color={deep} />
    <Block at={[0,.03,.07]} size={[.58,.055,.35]} color={ink} />
    <Block at={[0,.52,0]} size={[1.15,.69,.10]} color={ink} />
    <mesh position={[0,.52,.057]} scale={[1.04,.57,.023]}><primitive object={box} attach="geometry" dispose={null} /><meshStandardMaterial ref={screen} color={active ? '#235568' : '#31596a'} emissive="#5ebdab" /></mesh>
    {[.34,.43,.52,.61,.70].map((y,i) => <Block key={y} at={[-.12+(i%2)*.1,y,.078]} size={[.55-(i%3)*.13,.035,.015]} color={i%2 ? '#70a0a0' : color} glow={active} />)}
    <group ref={cursor}><Block at={[.37,.34,.08]} size={[.075,.035,.016]} color={active ? mint : '#51777d'} glow={active} /></group>
  </>;
}

function RackLight({ index, busy }: {index:number;busy:boolean}) {
  const material=useRef<MeshStandardMaterial>(null);
  const elapsed=useRef(0);
  useFrame((state,dt)=>{
    if(!material.current || document.hidden) return;
    if(state.frameloop==='always') elapsed.current+=Math.min(dt,.05);
    const pulse=state.frameloop==='always' ? (1+Math.sin(elapsed.current*(busy?3.8:1.1)+index*1.2))/2 : .4;
    material.current.emissiveIntensity=(busy?.2:.035)+pulse*(busy?.28:.11);
  });
  return <mesh position={[.51,0,.055]} scale={[.09,.067,.017]}>
    <primitive object={box} attach="geometry" dispose={null} />
    <meshStandardMaterial ref={material} color={busy?'#9de4af':'#6d9994'} emissive="#8ad3a9" />
  </mesh>;
}

function Desk({ at, active = false, color = mint, open, dual = true, theme=defaultOfficeTheme, finish=officeThemes[defaultOfficeTheme].palette }: { at: Point; active?: boolean; color?: string; open: () => void; dual?: boolean;theme?:OfficeThemeId;finish?:OfficeTheme['palette'] }) {
  const futuristic=theme==='space-station'||theme==='cyberpunk-rooftop';
  return <group position={at}>
    <Block at={[0,.93,0]} size={[2.24,.14,1.42]} color={finish.desk} />
    <Block at={[0,.82,-.08]} size={[2.12,.10,1.23]} color={futuristic?finish.frame:oak} />
    {futuristic ? [-.90,.90].map(x=><group key={x} position={[x,0,0]}>
          <Block at={[0,.41,-.17]} size={[.155,.82,.88]} color={finish.legs} />
          <Block at={[0,.045,-.04]} size={[.29,.09,1.19]} color={finish.frame} />
          <Block at={[0,.65,.278]} size={[.11,.04,.015]} color="#7deaf1" glow />
        </group>) : [-.91,.91].flatMap(x => [-.53,.53].map(z => <Block key={x+','+z} at={[x,.42,z]} size={[.095,.84,.095]} color={finish.legs} />))}
    <group position={[dual ? -.42 : 0,1,-.37]} onClick={e => { e.stopPropagation(); open(); }}><Display active={active} color={color} /></group>
    {dual && <group position={[.58,1,-.31]} rotation={[0,-.25,0]} scale={.72} onClick={e => { e.stopPropagation(); open(); }}><Display active={active} color={futuristic?color:"#7eaeba"} /></group>}
    <Block at={[-.08,1.025,.30]} size={[.82,.04,.28]} color="#aac0bb" />
    {[.23,.31,.39].map(z => <Block key={z} at={[-.08,1.055,z]} size={[.72,.014,.031]} color="#edf2df" />)}
    <Block at={[.68,1.02,.33]} size={[.2,.04,.27]} color="#648e90" />
    <Block at={[-.85,1.025,.36]} size={[.24,.042,.30]} color="#81b9b0" />
    <mesh position={[.88,1.096,.29]}><cylinderGeometry args={[.076,.067,.18,8]} /><meshStandardMaterial color="#e19f77" /></mesh>
    <group position={[0,0,1.04]}>
      <Block at={[0,.275,0]} size={[.70,.12,.66]} color={color} />
      <Block at={[0,.58,.29]} size={[.68,.50,.13]} color={color} />
      <Block at={[0,.14,0]} size={[.14,.22,.14]} color={ink} />
      <Block at={[0,.075,0]} size={[.69,.07,.10]} color={ink} />
      <Block at={[0,.075,0]} size={[.10,.07,.65]} color={ink} />
    </group>
  </group>;
}

type Inspection = {id:string; tab:FaceTab; target:FaceTarget};
function Worker({ session, at, seat, connected, inspection, motion, open, outfit, resting }: {
  session: Session; at: Point; seat: number; connected: boolean; inspection?: Inspection; motion: boolean; open: () => void; outfit:OutfitId;resting:RestLocation[];
}) {
  const body = useRef<Group>(null);
  const hips = useRef<Group>(null);
  const head = useRef<Group>(null);
  const eyes = useRef<Group>(null);
  const [lookTarget] = useState(() => new Vector3());
  const arms = useRef<Group[]>([]);
  const thighs = useRef<Group[]>([]);
  const shins = useRef<Group[]>([]);
  const boots = useRef<Group[]>([]);
  const [visual, setVisual] = useState<AnimationPhase>('COUCH_IDLE');
  const [hover, setHover] = useState(false);
  const route = useMemo(() => loungeRoute(seat,[at[0],at[2]],resting),[seat,at,resting]);
  const [robot] = useState(()=>({...createRobotMotion(),yaw:route.restYaw}));
  const inTurn = connected && working(session.state);
  const showSpeech = inTurn || (connected && session.state === 'waiting_for_approval');
  const successful = session.state === 'completed' && session.phase !== 'aborted';
  const quiet = session.state === 'idle' || session.state === 'completed' || (session.state === 'unknown' && session.resting);
  const intent = !connected ? 'hold' : successful ? 'finish' : quiet ? 'rest' : inTurn ? 'work' : 'hold';
  const alert = connected && session.state === 'waiting_for_approval' ? '#e1b66d' : connected && session.state === 'error' ? '#db755b' : null;
  const color = inTurn ? (session.isWsb ? '#53b9a8' : '#6196b7') : '#809b9f';
  const sofaTagOffset = seat < 3 && (visual === 'COUCH_IDLE' || visual === 'COUCH_SIT') ? (2-seat)*.24 : 0;
  useCursor(hover);

  useFrame((_,dt) => {
    if (document.hidden) return;
    stepRobot(robot,route,intent,dt,motion);
    if (robot.phase!==visual) setVisual(robot.phase);
    const pose=robotPose(robot,session.activity==='Coding',motion);
    const blend = motion ? Math.min(dt,.05) : 1;
    const spot=routePosition(route,robot.distance,1);
    const onCouch=robot.distance<.002;
    const surface:SeatKind=onCouch?(seat<3?'sofa':seat===3?'chair':'floor'):'desk';
    const {hipY,hipZ}=legPose(surface,robot.sit,pose.lift,0,0,0);
    if (body.current) {
      body.current.position.set(spot.x,0,spot.z);
      body.current.rotation.y=robot.yaw;
    }
    if (hips.current) {
      hips.current.position.y=hipY;
      hips.current.position.z=hipZ;
      hips.current.rotation.set(MathUtils.damp(hips.current.rotation.x,pose.lean,12,blend),0,MathUtils.damp(hips.current.rotation.z,pose.roll,12,blend));
      hips.current.scale.y=1+pose.breath;
    }
    if (head.current) {
      if (inspection) {
        head.current.getWorldPosition(lookTarget).add(inspection.target.direction);
        head.current.lookAt(lookTarget);
      } else {
        head.current.rotation.set(MathUtils.damp(head.current.rotation.x,pose.lookX,11,blend),MathUtils.damp(head.current.rotation.y,pose.lookY,11,blend),0);
      }
    }
    if (eyes.current) eyes.current.scale.y=pose.eyes;
    for(let side=0;side<2;side++) {
      const arm=arms.current[side], thigh=thighs.current[side], shin=shins.current[side], boot=boots.current[side];
      if(arm) arm.rotation.x=MathUtils.damp(arm.rotation.x,side===0?pose.left:pose.right,21,blend);
      if(!thigh||!shin||!boot) continue;
      // During the stance half, the ankle travels backward at ground speed.
      const cycle=(pose.cycle+side*.5)%1;
      const swing=cycle>=.5;
      const stepZ=pose.moving ? (swing ? cycle-.75 : .25-cycle)*pose.stride : 0;
      const lift=pose.moving&&swing ? Math.sin((cycle-.5)*Math.PI*2)*(pose.sprint?.105:.055) : 0;
      const joints=legPose(surface,robot.sit,pose.lift,stepZ,lift,pose.legSwing*(side===0?1:-1));
      placeBone(thigh,joints.hipY,joints.hipZ,joints.kneeY,joints.kneeZ);
      placeBone(shin,joints.kneeY,joints.kneeZ,joints.ankleY,joints.ankleZ);
      boot.position.y=joints.ankleY;
      boot.position.z=joints.ankleZ;
    }
  });
  return <group ref={body} position={[route.rest[0],0,route.rest[1]]} rotation={[0,route.restYaw,0]} onPointerOver={event=>{event.stopPropagation();setHover(true);}} onPointerOut={()=>setHover(false)} onClick={event=>{event.stopPropagation();open();}}>
    <group ref={hips} position={[0,route.restHeight,0]}>
      <RoundedBox args={[.56,.48,.39]} radius={.075} smoothness={2} position={[0,.24,0]} castShadow><meshStandardMaterial color={color} /></RoundedBox>
      <RobotOutfit id={outfit} />
      <Block at={[0,.22,.205]} size={[.28,.12,.036]} color={ink} />
      <Block at={[0,.22,.229]} size={[.12,.032,.012]} color={mint} glow={inTurn} />
      <group ref={value=>{head.current=value;inspection?.target.setHead(value);}} position={[0,.67,0]}>
        <RoundedBox args={[.68,.49,.46]} radius={.112} smoothness={2} castShadow><meshStandardMaterial color="#e4eee4" /></RoundedBox>
        <RoundedBox args={[.54,.26,.076]} radius={.034} smoothness={2} position={[0,.006,.224]}><meshStandardMaterial color={ink} /></RoundedBox>
        <group ref={eyes} position={[0,.023,0]}>{[-.121,.121].map(x=><Block key={x} at={[x,0,.267]} size={[.067,.069,.016]} color={alert ?? mint} glow={inTurn} />)}</group>
        <Block at={[0,-.061,.270]} size={[.092,.023,.014]} color={inTurn ? '#8fe2c5' : '#62928d'} />
        {[-.36,.36].map(x=><mesh key={x} position={[x,0,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.115,.115,.086,8]} /><meshStandardMaterial color={color} /></mesh>)}
        <Block at={[.21,.28,-.045]} size={[.034,.14,.035]} color={deep} />
        <Block at={[.21,.36,-.045]} size={[.072,.055,.068]} color={alert ?? mint} />
        <RobotOutfit id={outfit} part="head" inspecting={!!inspection} />
        {inspection && <RobotFace session={session} connected={connected} tab={inspection.tab} target={inspection.target} />}
      </group>
      {[-.34,.34].map((x,i)=><group key={x} ref={value=>{arms.current[i]=value;}} position={[x,.36,0]}>
        <Block at={[0,-.12,0]} size={[.13,.27,.13]} color={deep} />
        <Block at={[0,-.23,.13]} size={[.14,.12,.32]} color={color} />
      </group>)}
      {alert && <mesh position={[0,1.19,0]}><octahedronGeometry args={[.105]} /><meshBasicMaterial color={alert} /></mesh>}
      <Marker at={[0,1.31+sofaTagOffset,0]} label={project(session)} onClick={open} session={connected ? session : {...session,state:'disconnected'}} animation={visual} outfit={outfit} speech={showSpeech ? 'HUSS! HUSS! HUSS!' : undefined} />
    </group>
    {[-.15,.15].map((x,i)=><Leg key={x} hipX={x} outfit={outfit} thigh={value=>{thighs.current[i]=value;}} shin={value=>{shins.current[i]=value;}} boot={value=>{boots.current[i]=value;}} />)}
    <mesh position={[0,.081,0]} rotation={[-Math.PI/2,0,0]} visible={hover}><ringGeometry args={[.46,.49,30]} /><meshBasicMaterial color="#8ad8c4" /></mesh>
  </group>;
}

function placeBone(bone:Group, fromY:number, fromZ:number, toY:number, toZ:number) {
  bone.position.set(0,fromY,fromZ);
  bone.rotation.x=Math.atan2(fromZ-toZ,fromY-toY);
  bone.scale.y=Math.hypot(toY-fromY,toZ-fromZ);
}

function Leg({hipX,thigh,shin,boot,outfit}: {
  hipX:number; thigh:(value:Group|null)=>void; shin:(value:Group|null)=>void; boot:(value:Group|null)=>void;outfit:OutfitId;
}) {
  return <group position={[hipX,0,0]}>
    <group ref={thigh}><Block at={[0,-.5,0]} size={[.15,1,.13]} color={deep} /></group>
    <group ref={shin}><Block at={[0,-.5,0]} size={[.13,1,.12]} color={ocean} /></group>
    <group ref={boot}>
      {outfit==='beach'?<Block at={[0,-.021,.040]} size={[.153,.077,.175]} color="#8dad9e" />:outfit==='office'&&<Block at={[0,-.030,.046]} size={[.16,.095,.20]} color={ink} />}
      <RobotOutfit id={outfit} part="foot" />
    </group>
  </group>;
}

type CameraPose = {position:Vector3; rotation:Quaternion; target:Vector3; zoom:number};
function Camera({ reset, focus, motion, inspection, preset }: { reset: number; focus?: Point; motion: boolean; inspection?:Inspection;preset:OfficeTheme['camera'] }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { get, size, invalidate } = useThree();
  const destination = useRef<Vector3 | null>(null);
  const tour=useRef<{saved:CameraPose;start:CameraPose;elapsed:number;returning:boolean}|null>(null);
  const lastPreset=useRef<{preset:OfficeTheme['camera']; reset:number}|null>(null);
  const handover=useRef<{position:Vector3;target:Vector3;zoom:number;elapsed:number}|null>(null);
  const [scratch]=useState(()=>({point:new Vector3(),position:new Vector3(),matrix:new Matrix4(),rotation:new Quaternion()}));
  useEffect(()=>{invalidate();},[inspection?.id,motion,invalidate]);
  useLayoutEffect(() => {
    const lens = get().camera as OrthographicCamera;
    const orbit=controls.current;
    const previous=lastPreset.current;
    const zoom=Math.min(size.width/preset.width,size.height/preset.height);
    lastPreset.current={preset,reset};
    if(orbit&&previous&&previous.preset!==preset&&previous.reset===reset&&motion) {
      handover.current={position:lens.position.clone(),target:orbit.target.clone(),zoom:lens.zoom,elapsed:0};
      destination.current=null;
      invalidate();
      return;
    }
    handover.current=null;
    lens.zoom=zoom;
    lens.updateProjectionMatrix();
    if(!previous || previous.preset!==preset || previous.reset!==reset) {
      lens.position.set(...preset.position);
      orbit?.target.set(0,1.19,0);
      orbit?.update();
    }
    destination.current = null;
    invalidate();
  }, [get,size,invalidate,reset,preset,motion]);
  useEffect(() => {
    if (focus && motion) {
      destination.current = new Vector3(focus[0]*.14,1.19,focus[2]*.14);
      invalidate();
    } else destination.current = null;
  }, [focus,motion,invalidate]);
  useFrame((_,dt) => {
    const orbit=controls.current;
    const lens=get().camera as OrthographicCamera;
    const face=inspection?.target;
    const transition=handover.current;
    if(transition&&orbit&&!face&&!tour.current) {
      transition.elapsed+=Math.min(dt,.065);
      const n=Math.min(1,transition.elapsed/.44);
      const blend=n*n*(3-2*n);
      lens.position.lerpVectors(transition.position,scratch.position.set(...preset.position),blend);
      orbit.target.lerpVectors(transition.target,scratch.point.set(0,1.19,0),blend);
      lens.zoom=MathUtils.lerp(transition.zoom,Math.min(size.width/preset.width,size.height/preset.height),blend);
      lens.updateProjectionMatrix();
      orbit.update();
      if(n===1) handover.current=null;
      else invalidate();
      return;
    }
    if(face) handover.current=null;
    if(orbit && (face?.head || tour.current)) {
      const capture=():CameraPose=>({position:lens.position.clone(),rotation:lens.quaternion.clone(),target:orbit.target.clone(),zoom:lens.zoom});
      if(face?.head && !tour.current) {
        const saved=capture();
        tour.current={saved,start:saved,elapsed:0,returning:false};
        face.head.getWorldPosition(scratch.point);
        face.direction.copy(saved.position).sub(scratch.point);
        face.direction.setY(0);
        if(face.direction.lengthSq()<.0001) face.direction.set(0,0,1);
        face.direction.normalize().setY(.17).normalize();
        destination.current=null;
      }
      const ride=tour.current;
      if(!ride) return;
      orbit.enabled=false;
      if(!face?.head && !ride.returning) {
        ride.returning=true;
        ride.start=capture();
        ride.elapsed=0;
      }
      ride.elapsed+=Math.min(dt,.065);
      const linear=motion?Math.min(1,ride.elapsed/.76):1;
      const progress=linear*linear*(3-2*linear);
      if(face?.head && !ride.returning) {
        const needsFaceFrame=face.amount<.93 && linear>=.93;
        face.setAmount(linear);
        face.head.getWorldPosition(scratch.point).addScaledVector(face.direction,.26);
        scratch.position.copy(scratch.point).addScaledVector(face.direction,.91);
        scratch.rotation.setFromRotationMatrix(scratch.matrix.lookAt(scratch.position,scratch.point,lens.up));
        lens.position.lerpVectors(ride.start.position,scratch.position,progress);
        lens.quaternion.slerpQuaternions(ride.start.rotation,scratch.rotation,progress);
        lens.zoom=MathUtils.lerp(ride.start.zoom,Math.min(size.width/.88,size.height/.65),progress);
        if(needsFaceFrame) invalidate();
      } else {
        lens.position.lerpVectors(ride.start.position,ride.saved.position,progress);
        lens.quaternion.slerpQuaternions(ride.start.rotation,ride.saved.rotation,progress);
        lens.zoom=MathUtils.lerp(ride.start.zoom,ride.saved.zoom,progress);
        if(linear===1) {
          orbit.target.copy(ride.saved.target);
          orbit.enabled=true;
          tour.current=null;
          invalidate();
        }
      }
      lens.updateProjectionMatrix();
      if(linear<1) invalidate();
      return;
    }
    const target = orbit?.target;
    if (!destination.current || !target) return;
    if (target.distanceToSquared(destination.current) < .00025) {
      destination.current = null;
      return;
    }
    const x = MathUtils.damp(target.x,destination.current.x,10,dt)-target.x;
    const z = MathUtils.damp(target.z,destination.current.z,10,dt)-target.z;
    target.set(target.x+x,target.y,target.z+z);
    const position = get().camera.position;
    position.set(position.x+x,position.y,position.z+z);
    controls.current?.update();
    invalidate();
  });
  return <OrbitControls ref={controls} enableDamping dampingFactor={.12} maxPolarAngle={Math.PI / 2.17} minPolarAngle={.25} minAzimuthAngle={.10} maxAzimuthAngle={1.40} minZoom={Math.min(size.width/(preset.width+7),size.height/(preset.height+5.4))} maxZoom={size.height / 5} />;
}

function ThemeLights({lights,motion}: {lights:OfficeTheme['lights'];motion:boolean}) {
  const ambient=useRef<HemisphereLight>(null);
  const sun=useRef<DirectionalLight>(null);
  const colors=useMemo(()=>[new Color(lights.sky),new Color(lights.ground),new Color(lights.key)] as const,[lights]);
  useFrame((_,dt)=>{
    const blend=motion?1-Math.exp(-Math.min(dt,.065)*9):1;
    if(ambient.current) {
      ambient.current.color.lerp(colors[0],blend);
      ambient.current.groundColor.lerp(colors[1],blend);
      ambient.current.intensity=MathUtils.lerp(ambient.current.intensity,lights.ambient,blend);
    }
    if(sun.current) {
      sun.current.color.lerp(colors[2],blend);
      sun.current.intensity=MathUtils.lerp(sun.current.intensity,lights.sun,blend);
    }
  });
  return <>
    <hemisphereLight ref={ambient} args={['#f6ffff','#839c91',2.0]} />
    <directionalLight ref={sun} position={[3,12,7]} intensity={2.3} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={10} shadow-camera-bottom={-10} shadow-normalBias={.027} shadow-bias={-.0003} shadow-radius={3} />
  </>;
}

function Scene({ workers, connected, onSelect, reset, selected, motion, inspection, inspect, theme=defaultOfficeTheme }: Props & {motion:boolean;inspection?:Inspection;inspect:(id:string)=>void}) {
  const definition=officeThemes[theme];
  const {palette,lights}=definition;
  const beach=theme==='tropical-beach';
  const standard=theme===defaultOfficeTheme;
  const futuristic=theme==='cyberpunk-rooftop'||theme==='space-station';
  const Environment=environments[theme];
  const usageAt=useMemo<Point>(()=>beach?[-8.55,1.47,-1.93]:standard?[-2.65,2.23,-5.21]:[-3.2,1.70,theme==='space-station'?-5.02:-5.44],[beach,standard,theme]);
  const usageScale=beach?.50:standard?1:.70;
  const assignments = useRef(new Map<string,number>());
  const previousSeats = useRef(new Map<string,number>());
  const [slots, setSlots] = useState<Map<string,number>>(() => new Map());
  useEffect(() => {
    const next = new Map([...assignments.current].filter(([id]) => workers.some(worker => worker.id === id)));
    const used = new Set(next.values());
    for (const worker of workers) {
      if (next.has(worker.id)) continue;
      const preferred = previousSeats.current.get(worker.id);
      let slot = preferred !== undefined && !used.has(preferred) ? preferred : 0;
      while (used.has(slot)) slot++;
      if (slot >= 9) continue;
      used.add(slot);
      next.set(worker.id,slot);
      previousSeats.current.set(worker.id,slot);
    }
    assignments.current = next;
    // Desk allocation is derived from the previous committed assignment.
    setSlots(next);
  }, [workers]);
  const activeAt = (slot: number) => workers.find(worker => slots.get(worker.id) === slot);
  const select = (kind: Target['kind'], id?: string) => () => onSelect({kind,id});
  const active = (worker?: Session) => connected && !!worker && working(worker.state);
  const testing = workers.some(worker => active(worker) && worker.activity === 'Testing');
  const building = workers.some(worker => active(worker) && worker.activity === 'Building');
  const deploying = workers.some(worker => active(worker) && worker.activity === 'Deployment');
  const extra = Math.max(0,...[...slots.values()].map(slot=>slot-5));
  const visibleDesks = useMemo(()=>[...definition.workstations,...Array.from({length:extra},(_,i):Point=>[-5.25+i*3,0,4.3])],[definition,extra]);
  const focus = useMemo((): Point | undefined => {
    if (!selected) return;
    const slot = selected.id ? slots.get(selected.id) : undefined;
    if (slot !== undefined) return visibleDesks[slot];
    if (selected.kind === 'usage') return usageAt;
    if (selected.kind === 'compute') return [5.78,0,-4.2];
    if (selected.kind === 'tests' || selected.kind === 'deploy') return [selected.kind==='tests'?3.7:6.15,0,-1.72];
  },[selected,slots,visibleDesks,usageAt]);
  return <>
    <ThemeLights lights={lights} motion={motion} />
    {Environment ? <Suspense fallback={null}><Environment motion={motion} /></Suspense> : <>
    <HeadquartersShell />
    <OfficeFloor />
    <Bookcase />
    <WallClock />
    </>}
    <group position={usageAt} scale={usageScale} onClick={e => { e.stopPropagation(); onSelect({kind:'usage'}); }}>
      <Block at={[0,0,0]} size={[4.1,1.67,.21]} color={ink} />
      {!standard&&[-1.7,1.7].map(x=><Block key={x} at={[x,beach?-1.65:-1.42,-.14]} size={[.16,beach?2.57:2.25,.18]} color={palette.frame} />)}
      <WallSign />
    </group>
    <Marker at={[usageAt[0],usageAt[1]-.92*usageScale,usageAt[2]+.50*usageScale]} label="Codex usage" onClick={select('usage')} />
    {beach ? Array.from({length:13},(_,i)=><Block key={i} at={[-6.36+i*.665,.012,-.4]} size={[.648,.03,6.16]} color={i%2?'#c99b65':'#d6ab73'} />) : standard&&<Block at={[-2.37,.012,.14]} size={[8.65,.03,6.34]} color="#bac9c8" />}
    <Block at={[4.73,.02,3.10]} size={[4.75,.04,3.67]} color={standard?'#a9bfbd':beach?'#d9b278':palette.frame} />
    {visibleDesks.map((at,i) => <Desk key={i} at={at} theme={theme} finish={palette} active={active(activeAt(i))} color={activeAt(i)?.activity === 'Testing' ? '#e1bf87' : !standard?palette.seat:i % 2 ? '#5c9ba8' : mint} open={select('monitor',activeAt(i)?.id)} />)}
    <Marker at={[-5.25,1.88,-2.21]} label="Workstation activity" onClick={select('monitor',activeAt(0)?.id)} />
    <group position={[5.78,0,-4.20]} onClick={e => { e.stopPropagation(); onSelect({kind:'compute'}); }}>
      <Block at={[0,1.38,0]} size={[2.18,2.72,1.17]} color={palette.frame} />
      <Block at={[0,1.45,.595]} size={[1.93,2.36,.07]} color={ink} />
      {Array.from({length:6},(_,i) => <group key={i} position={[0,.53+i*.35,.64]}>
        <Block at={[0,0,0]} size={[1.7,.24,.08]} color={i % 2 ? '#385e6e' : '#436776'} />
        <Block at={[-.46,0,.048]} size={[.48,.036,.014]} color="#809a9a" />
        <RackLight index={i} busy={building} />
      </group>)}
      <Marker at={[0,2.96,.52]} label="Compute rack" onClick={select('compute')} />
    </group>
    <Desk at={[3.7,0,-1.72]} dual={false} theme={theme} finish={palette} active={testing} color={!standard?palette.seat:'#8cc8ae'} open={select('tests')} />
    <Desk at={[6.15,0,-1.72]} dual={false} theme={theme} finish={palette} active={deploying} color={!standard?palette.seat:'#76aec2'} open={select('deploy')} />
    <Marker at={[3.7,1.90,-2.06]} label="Test bench" onClick={select('tests')} />
    <Marker at={[6.15,1.90,-2.06]} label="Deployment" onClick={select('deploy')} />
    <group position={[4.85,0,2.0]}>
      <Block at={[0,.19,0]} size={[3.48,.27,1.30]} color={palette.frame} />
      <Block at={[0,.65,-.51]} size={[3.48,.69,.29]} color={palette.legs} />
      {futuristic && [-1,0,1].map(x=><Block key={x} at={[x,.72,-.346]} size={[.94,.39,.045]} color={palette.seat} />)}
      {futuristic && <Block at={[0,.11,.66]} size={[2.70,.022,.025]} color="#7deaf1" glow />}
      {[-1.59,1.59].map(x => <Block key={x} at={[x,.40,0]} size={[.30,.42,1.30]} color={palette.legs} />)}
      {[-.98,0,.98].map(x => <Block key={x} at={[x,.325,.05]} size={[.95,.09,.97]} color={palette.seat} />)}
      {!futuristic && <Block at={[.91,.59,-.18]} size={[.53,.33,.22]} color="#ecddba" />}
    </group>
    {(standard||beach||theme==='forest-cabin')&&<LoungeLamp />}
    <group position={[4.84,0,3.65]}>
      <mesh position={[0,.44,0]} castShadow receiveShadow><cylinderGeometry args={[.66,.66,.095,futuristic?6:12]} /><meshStandardMaterial color={palette.desk} /></mesh>
      <mesh position={[0,.23,0]} castShadow><cylinderGeometry args={[.12,.22,.44,8]} /><meshStandardMaterial color={deep} /></mesh>
      <Block at={[.12,.50,.17]} size={[.36,.04,.27]} color={ocean} />
      <mesh position={[-.27,.57,-.07]}><cylinderGeometry args={[.077,.067,.16,8]} /><meshStandardMaterial color="#dc9a72" /></mesh>
    </group>
    <group position={[loungeChair.position[0],0,loungeChair.position[1]]} rotation={[0,loungeChair.yaw,0]}>
      <Block at={[0,loungeChair.height-.13,0]} size={[.84,.14,.83]} color={palette.seat} />
      <Block at={[0,.60,-.36]} size={[.85,.57,.13]} color={palette.legs} />
      {[-.32,.32].flatMap(x=>[-.30,.30].map(z=><Block key={x+','+z} at={[x,.12,z]} size={[.09,.24,.09]} color={palette.frame} />))}
    </group>
    {(standard||beach||theme==='forest-cabin')&&<><Plant at={[-6.75,0,-4.14]} size={1.15} /><Plant at={[7.04,0,4.44]} size={1.16} /><Plant at={[-6.89,0,4.58]} size={.82} /></>}
    {!standard&&!beach&&definition.resting.slice(4).map(({position:[x,z]},i)=><Block key={i} at={[x,.032,z]} size={[.69,.06,.46]} color={palette.seat} />)}
    <Block at={[-5.0,.41,-4.55]} size={[1.94,.82,.64]} color={standard||beach?deep:palette.frame} />
    <Block at={[-5.0,.84,-4.55]} size={[2.03,.09,.72]} color={standard||beach?foam:palette.desk} />
    {[-5.47,-4.55].map(x => <Block key={x} at={[x,.46,-4.217]} size={[.27,.038,.025]} color="#bad6cc" />)}
    {workers.map(worker => {
      const slot = slots.get(worker.id);
      if (slot == null || slot >= visibleDesks.length) return null;
      const [x,,z] = visibleDesks[slot];
      return <Worker key={worker.id} session={worker} at={[x,0,z+1.03]} seat={slot} connected={connected} inspection={inspection?.id===worker.id?inspection:undefined} motion={motion} open={()=>inspect(worker.id)} outfit={definition.outfit} resting={definition.resting} />;
    })}
    <Camera reset={reset} focus={focus} motion={motion} inspection={inspection} preset={definition.camera} />
  </>;
}

type Props = { workers: Session[]; connected: boolean; onSelect: (target: Target) => void; reset: number; selected?: Target; motionPaused?:boolean;theme?:OfficeThemeId };
class SceneBoundary extends Component<{children: React.ReactNode; fallback: React.ReactNode}, {failed: boolean}> {
  state = {failed:false};
  static getDerivedStateFromError() { return {failed:true}; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function Office(props: Props) {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(() => !document.hidden);
  const motion = !reduced && !props.motionPaused;
  const [markers] = useState(createMarkerStore);
  const [inspected,setInspected]=useState<string>();
  const [tab,setTab]=useState<FaceTab>('Status');
  const [face]=useState(createFaceTarget);
  const back=useRef<HTMLButtonElement>(null);
  const session=props.workers.find(worker=>worker.id===inspected);
  const inspection=session?{id:session.id,tab,target:face}:undefined;
  function inspect(id:string) {
    if(session) return;
    face.setAmount(0);
    setTab('Status');
    setInspected(id);
  }
  useEffect(()=>{
    if(!session?.id) return;
    const id=session.id;
    back.current?.focus();
    const escape=(event:KeyboardEvent)=>{
      if(event.key==='Escape') {event.preventDefault();setInspected(undefined);}
    };
    document.addEventListener('keydown',escape);
    return ()=>{
      document.removeEventListener('keydown',escape);
      document.querySelector<HTMLButtonElement>(`[data-session="${CSS.escape(id)}"]`)?.focus();
    };
  },[session?.id]);
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => setReduced(reduced.matches);
    const syncVisibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange',syncVisibility);
    reduced.addEventListener('change',syncMotion);
    return () => { document.removeEventListener('visibilitychange',syncVisibility); reduced.removeEventListener('change',syncMotion); };
  }, []);
  const fallback = <div className="scene-message">The 3D office needs WebGL. <button onClick={() => props.onSelect({kind:'usage'})}>Open Codex usage</button></div>;
  return <section className="world" data-inspecting={inspection?'true':undefined} aria-label="Interactive 3D office">
    <SceneBoundary fallback={fallback}>
      <Canvas orthographic camera={{ position:cameraPosition, near:.1, far:110 }} shadows={{type:PCFShadowMap}} dpr={[1,1.35]} frameloop={motion && visible?'always':'demand'} fallback={fallback}>
        <MarkerLayer.Provider value={markers}><Scene {...props} motion={motion} inspection={inspection} inspect={inspect} /></MarkerLayer.Provider>
      </Canvas>
      <OfficeMarkerOverlay store={markers} />
    </SceneBoundary>
    {session && <div className="face-controls" aria-label="Robot face inspection" data-session-view={session.id}>
      <button type="button" ref={back} onClick={()=>setInspected(undefined)}>Back to office</button>
      <div role="group" aria-label="Face display">
        {faceTabs.map(view=><button type="button" key={view} aria-pressed={tab===view} onClick={()=>setTab(view)}>{view}</button>)}
      </div>
      <dl className="sr-only" aria-label={`Robot face · ${tab}`}>{faceReadings(session,tab,props.connected).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </div>}
  </section>;
}
