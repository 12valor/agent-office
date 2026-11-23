'use client';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { BoxGeometry, BufferGeometry, Float32BufferAttribute } from 'three';
import type { Group, MeshBasicMaterial } from 'three';

type Point=[number,number,number];
const box=new BoxGeometry(), timber='#93623b', bamboo='#d7af75', cream='#fce2aa', green='#428d62';
function Beam({at,size,color=timber,angle=0}: {at:Point;size:Point;color?:string;angle?:number}) {
  return <mesh position={at} scale={size} rotation={[0,0,angle]} castShadow receiveShadow>
    <primitive object={box} attach="geometry" dispose={null}/><meshStandardMaterial color={color} roughness={.88}/>
  </mesh>;
}

const frond=new BufferGeometry();
frond.setAttribute('position',new Float32BufferAttribute([
  0,0,0,.17,.37,.66,0,.47,.79, 0,0,0,0,.47,.79,-.17,.37,.66,
  .17,.37,.66,0,-.24,1.72,0,.47,.79, 0,.47,.79,0,-.24,1.72,-.17,.37,.66,
],3));
frond.computeVertexNormals();
const petals=new BufferGeometry();
const petalPoints=[];
for(let i=0;i<5;i++) {
  const angle=i*Math.PI*2/5;
  const sin=Math.sin(angle),cos=Math.cos(angle);
  const outline=[[-.006,.004],[-.013,.019],[-.008,.034],[.008,.034],[.013,.019],[.006,.004]];
  for(let j=0;j<outline.length;j++) {
    petalPoints.push(0,0,0);
    for(const [x,y] of [outline[j],outline[(j+1)%outline.length]]) petalPoints.push(x*cos-y*sin,x*sin+y*cos,0);
  }
}
petals.setAttribute('position',new Float32BufferAttribute(petalPoints,3));
function Palm({at,scale=1,phase=0}: {at:Point;scale?:number;phase?:number}) {
  const canopy=useRef<Group>(null);
  useFrame(({clock,frameloop})=>{
    if(canopy.current) canopy.current.rotation.z=frameloop==='always'?Math.sin(clock.elapsedTime*1.35+phase)*.065:0;
  });
  return <group position={at} scale={scale}>
    {[0,1,2,3,4].map(i=><mesh key={i} position={[.043*i*i,.31+i*.57,0]} rotation={[0,0,-i*.085]} castShadow>
      <cylinderGeometry args={[.13-i*.013,.15-i*.013,.65,7]}/><meshStandardMaterial color={i%2?'#b48b59':'#9b7045'}/>
    </mesh>)}
    <group ref={canopy} position={[.71,2.92,0]}>
      {Array.from({length:8},(_,i)=><mesh key={i} rotation={[i%2 ? -.16:.12,i*Math.PI/4+phase,0]} castShadow>
        <primitive object={frond} attach="geometry" dispose={null}/>
        <meshStandardMaterial color={i%3===0?'#69ad6d':green} side={2} roughness={.9}/>
      </mesh>)}
      {[-.15,.13].map(x=><mesh key={x} position={[x,-.06,.11]}><icosahedronGeometry args={[.145,0]}/><meshStandardMaterial color="#765538"/></mesh>)}
    </group>
  </group>;
}

function Surf() {
  const strip=useRef<Group>(null);
  const sheen=useRef<MeshBasicMaterial>(null);
  useFrame(({clock,frameloop})=>{
    const t=frameloop==='always'?clock.elapsedTime:0;
    if(strip.current) strip.current.scale.setScalar(1+.012*Math.sin(t*1.08));
    if(sheen.current) sheen.current.opacity=.31+.08*Math.sin(t*1.36);
  });
  return <>
    <mesh position={[0,-.55,0]} scale={[1.12,1,.85]} receiveShadow>
      <cylinderGeometry args={[13.65,13.04,.48,48]}/><meshStandardMaterial color="#269d9d" roughness={.56} />
    </mesh>
    <mesh position={[0,-.30,0]} rotation={[-Math.PI/2,0,0]} scale={[1.14,.83,1]}>
      <ringGeometry args={[9.65,12.85,52]}/><meshBasicMaterial color="#6cd2c2" transparent opacity={.56} depthWrite={false}/>
    </mesh>
    <group ref={strip} position={[0,-.245,0]}>
      {[.12,.48,.9].map((out,i)=><mesh key={out} rotation={[-Math.PI/2,0,0]} scale={[1.17,.82,1]}>
        <ringGeometry args={[9.5+out,9.57+out,52,1,i*.7,Math.PI*(1.41-i*.19)]}/>
        <meshBasicMaterial color="#e1fff1" transparent opacity={.66-i*.19} depthWrite={false}/>
      </mesh>)}
    </group>
    <mesh position={[0,-.286,0]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[12.55,12.65,48,1,2.2,2.5]}/><meshBasicMaterial ref={sheen} color="#cbf7ec" transparent opacity={.31} depthWrite={false}/>
    </mesh>
  </>;
}

function Clouds() {
  const clouds=useRef<Group>(null);
  useFrame(({clock,frameloop})=>{if(clouds.current) clouds.current.position.x=frameloop==='always'?Math.sin(clock.elapsedTime*.14)*1.15:0;});
  return <group ref={clouds}>
    {[[-9,4.2,-7.4],[3.7,4.65,-9.4],[9.9,3.5,-7.5]].map(([x,y,z],j)=><group key={j} position={[x,y,z]} scale={j===1?.72:.94}>
      {[-.74,0,.65].map((p,i)=><mesh key={i} position={[p,i===1?.14:0,0]} scale={[.9,.29+i%2*.19,.43]}>
        <icosahedronGeometry args={[1,1]}/><meshStandardMaterial color="#fbfcf0" roughness={1}/>
      </mesh>)}
    </group>)}
  </group>;
}

function Pavilion() {
  return <group>
    {[-6.54,2.02].flatMap(x=>[-3.93,2.05].map(z=><group key={x+','+z} position={[x,0,z]}>
      <Beam at={[0,1.48,0]} size={[.15,3,.15]}/><Beam at={[0,.09,0]} size={[.32,.18,.31]} color="#c2ae8a"/>
      <Beam at={[0,2.97,0]} size={[.24,.16,.24]} color={bamboo}/>
    </group>))}
    {[-4,2.12].map(z=><Beam key={z} at={[-2.26,3.04,z]} size={[9.05,.19,.18]} color={bamboo}/>)}
    {[-6.58,1.98].map(x=><Beam key={x} at={[x,3.06,-.96]} size={[.17,.19,6.58]} color={bamboo}/>)}
    {Array.from({length:15},(_,i)=><Beam key={i} at={[-6.63+i*.62,3.19,-.95]} size={[.16,.095,6.5]} color={i%4===0?'#e7c289':timber}/>)}
    <Beam at={[-2.27,3.23,-3.46]} size={[8.94,.065,1.12]} color={cream}/>
    <Beam at={[-2.27,3.23,.56]} size={[8.94,.065,.86]} color="#e8c281"/>
    <Beam at={[-2.27,3.11,2.11]} size={[8.43,.10,.13]} color="#f4dda0"/>
  </group>;
}

function BeachSeat({at,rotation=0,color='#f38c68'}:{at:Point;rotation?:number;color?:string}) {
  return <group position={at} rotation={[0,rotation,0]}>
    <Beam at={[0,.21,0]} size={[.77,.14,1.33]} color={bamboo}/>
    <Beam at={[0,.3,.19]} size={[.67,.09,.87]} color={color}/>
    <mesh position={[0,.47,-.37]} rotation={[-.62,0,0]} castShadow><boxGeometry args={[.67,.16,.64]}/><meshStandardMaterial color={color}/></mesh>
    {[-.29,.29].flatMap(x=>[-.45,.45].map(z=><Beam key={x+','+z} at={[x,.10,z]} size={[.09,.2,.1]}/>))}
  </group>;
}

function Umbrella({at}:{at:Point}) {
  return <group position={at}>
    <Beam at={[0,1.01,0]} size={[.055,2.03,.055]} color={timber}/>
    {Array.from({length:8},(_,i)=><mesh key={i} position={[0,2.03,0]} castShadow>
      <coneGeometry args={[1.05,.42,8,1,true,i*Math.PI/4,Math.PI/4]}/><meshStandardMaterial side={2} color={i%2?'#fff0c3':'#ef8b67'}/>
    </mesh>)}
    <mesh position={[0,2.27,0]}><sphereGeometry args={[.055,8,6]}/><meshStandardMaterial color={cream}/></mesh>
  </group>;
}

function Hammock() {
  return <group position={[-7.76,0,2.1]} rotation={[0,Math.PI/2,0]}>
    {[-1.26,1.26].map(x=><Beam key={x} at={[x,.66,0]} size={[.11,1.32,.11]}/>)}
    {Array.from({length:9},(_,i)=><Beam key={i}
      at={[-1.04+i*.26,.51+((i-4)/4)**2*.38,0]} size={[.29,.048,.53]} angle={(i-4)*.135}
      color={i%2?'#f4d48a':'#4da89c'}/>)}
    {[-1,1].map(sign=><Beam key={sign} at={[sign*1.15,1.01,0]} size={[.33,.036,.035]} angle={sign*.75} color={cream}/>)}
  </group>;
}

export default function BeachTheme() {
  return <>
    <Surf />
    <mesh position={[0,-.32,0]} scale={[1.16,1,.82]} castShadow receiveShadow>
      <cylinderGeometry args={[9.58,9.83,.64,32,1,false,.14]}/><meshStandardMaterial color="#eac081" roughness={.94}/>
    </mesh>
    {[-10.7,9.6].map((x,i)=><group key={x} position={[x,-.34,-7.55+i*.9]} scale={[i===1?1.2:.82,.55,.75]}>
      <mesh><cylinderGeometry args={[1.35,1.62,.41,11]}/><meshStandardMaterial color="#d3b679"/></mesh>
      <mesh position={[0,.39,-.11]} scale={[1,.62,.82]}><icosahedronGeometry args={[.85,0]}/><meshStandardMaterial color="#7eaa79"/></mesh>
    </group>)}
    <Clouds />
    <Pavilion />
    {[-3.7,-2.1,-.5,1.1,2.7,4.3].map(z=><Beam key={z} at={[2.25,.009,z]} size={[.71,.017,1.57]} color="#d7ab6d"/>)}
    <Palm at={[-8.05,0,-3.32]} phase={.3} /><Palm at={[7.48,0,-4.12]} scale={1.17} phase={1.2}/>
    <Palm at={[8.84,0,1.45]} scale={.83} phase={2.2}/><Palm at={[-5.92,0,5.73]} scale={.77} phase={1.7}/>
    <Umbrella at={[9.0,0,3.15]}/>
    <BeachSeat at={[9.05,0,3.77]} rotation={-.15}/><BeachSeat at={[7.13,0,5.20]} rotation={.53} color="#5aa996"/>
    <Hammock />
    <group position={[6.96,0,-4.98]}>
      <Beam at={[0,.53,0]} size={[1.25,.14,.53]} color={bamboo}/>
      {[-.46,.46].map(x=><Beam key={x} at={[x,.24,0]} size={[.10,.49,.13]}/>)}
      <Beam at={[.26,.72,.03]} size={[.34,.25,.22]} color="#dce9ca"/>
      {[-.38,-.13].map(x=><mesh key={x} position={[x,.68,.03]}><cylinderGeometry args={[.055,.036,.17,8]}/><meshStandardMaterial color="#e78360"/></mesh>)}
    </group>
    {[[-8.34,-4.38],[-8.65,3.9],[8.66,-2.14],[8.24,4.98],[-2.7,6.2]].map(([x,z],i)=><group key={i} position={[x,0,z]}>
      <mesh position={[0,.10,0]} scale={[.4,.24,.33]} castShadow><icosahedronGeometry args={[1,0]}/><meshStandardMaterial color="#ab9c87"/></mesh>
      <mesh position={[.32,.08,-.10]} scale={[.23,.18,.19]}><icosahedronGeometry args={[1,0]}/><meshStandardMaterial color="#c6b294"/></mesh>
    </group>)}
  </>;
}

export function BeachWear({part,inspecting=false}: {part:'torso'|'head'|'foot';inspecting?:boolean}) {
  if(part==='head') return <group>
    <mesh position={[0,.252,0]} castShadow><cylinderGeometry args={[.44,.43,.033,16]}/><meshStandardMaterial color="#e9b960" /></mesh>
    <mesh position={[0,.313,0]} castShadow><cylinderGeometry args={[.247,.315,.12,12]}/><meshStandardMaterial color="#f3cc78" /></mesh>
    <mesh position={[0,.271,0]}><cylinderGeometry args={[.305,.315,.028,12]}/><meshStandardMaterial color="#ad7448" /></mesh>
    {!inspecting && <group position={[0,.037,.275]}>
      {[-.133,.133].map(x=><Beam key={x} at={[x,0,0]} size={[.19,.084,.032]} color="#19363d"/>)}
      <Beam at={[0,.012,.003]} size={[.079,.023,.026]} color="#253e44"/>
      {[-.143,.123].map(x=><Beam key={x} at={[x,.011,.018]} size={[.11,.013,.009]} color="#63979a"/>)}
    </group>}
  </group>;
  if(part==='foot') return <group>
    <Beam at={[0,-.049,.055]} size={[.169,.052,.219]} color="#af7945"/>
    <Beam at={[.025,-.009,.076]} size={[.127,.031,.052]} color="#50a497" angle={-.18}/>
    <Beam at={[-.027,-.009,.105]} size={[.12,.031,.042]} color="#50a497" angle={.17}/>
  </group>;
  return <group>
    {[-1,1].map(side=><group key={side} scale={[side,1,1]}>
      <Beam at={[.207,.239,.194]} size={[.113,.348,.05]} color="#3b9e90"/>
      <Beam at={[.245,.235,.019]} size={[.048,.348,.321]} color="#3b9e90"/>
      <Beam at={[.125,.104,.198]} size={[.245,.081,.046]} color="#3b9e90"/>
      <Beam at={[.129,.377,.220]} size={[.087,.026,.014]} color="#ffdea0" angle={-.50}/>
      {[[.211,.329],[.21,.187],[.119,.105]].map(([x,y],i)=><group key={i} position={[x,y,.224]}>
        <mesh><primitive object={petals} attach="geometry" dispose={null}/><meshBasicMaterial color={i%2?'#ffe6a7':'#ff9e7e'} side={2}/></mesh>
        <mesh><sphereGeometry args={[.009,5,4]}/><meshBasicMaterial color="#e8d175"/></mesh>
      </group>)}
    </group>)}
  </group>;
}
