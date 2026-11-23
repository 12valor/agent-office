import { useLayoutEffect, useRef } from 'react';
import { Color, DoubleSide, Float32BufferAttribute, type IcosahedronGeometry } from 'three';
import { Drift, Pieces, type Piece } from './ThemeScenery';

const windowFrames: Piece[] = Array.from({length:9},(_,i)=>{
  const x=-8.04+i*2.01;
  return [[x,1.9,-5.7+Math.pow(x/8,2)*1.25],[.15,3.4,.22],[0,0,-x*.022]];
});
const windowBeams: Piece[] = [0,3.53].flatMap(y=>windowFrames.slice(0,-1).map(([[x,,z]],i):Piece=>{
  const [nextX,,nextZ]=windowFrames[i+1][0];
  return [[(x+nextX)/2,y,(z+nextZ)/2],[Math.hypot(nextX-x,nextZ-z)+.08,.22,.29],[0,-Math.atan2(nextZ-z,nextX-x),0]];
}));
const stars: Piece[] = Array.from({length:110},(_,i)=>{
  const radius=.025+(i%7)*.012;
  return [[-28+i*149%563/10,-4+i*71%225/12,-18-i%4],[radius,radius,.04],[0,0,.78]];
});
function Planet() {
  const globe=useRef<IcosahedronGeometry>(null);
  useLayoutEffect(()=>{
    const geometry=globe.current;
    if(!geometry) return;
    const colors=['#3d83ab','#58a9cb','#7cbca8','#a2c9cb'].map(color=>new Color(color));
    const positions=geometry.attributes.position;
    const paint=new Float32Array(positions.count*3);
    for(let i=0;i<positions.count;i+=3){
      const x=(positions.getX(i)+positions.getX(i+1)+positions.getX(i+2))/3;
      const y=(positions.getY(i)+positions.getY(i+1)+positions.getY(i+2))/3;
      const z=(positions.getZ(i)+positions.getZ(i+1)+positions.getZ(i+2))/3;
      const land=Math.sin(x*4+y*2)+Math.cos(z*3-x*2)+Math.sin(y*5-z);
      const color=colors[Math.abs(y)>1.76?3:land>1.1?2:land>.63?1:0];
      for(let vertex=0;vertex<3;vertex++) paint.set([color.r,color.g,color.b],(i+vertex)*3);
    }
    geometry.setAttribute('color',new Float32BufferAttribute(paint,3));
  },[]);
  return <mesh><icosahedronGeometry ref={globe} args={[2,4]} /><meshStandardMaterial vertexColors flatShading /></mesh>;
}

export default function StationTheme({ motion }: {motion:boolean}) {
  return <group name="Space station">
    <Drift at={[0,0,0]} speed={.19} motion={motion} update={(g,wave)=>{g.position.x=wave*.38;}}>
      <Pieces pieces={stars.filter((_,i)=>i%5!==0)} color="#839dc6" glow />
      <Pieces pieces={stars.filter((_,i)=>i%5===0)} color="#f1f6ff" glow />
    </Drift>
    <Drift at={[1.8,3.55,-9.35]} speed={.18} motion={motion} update={(g,wave)=>{g.rotation.y=.44+wave*.32;}}>
      <Planet />
      <mesh rotation={[Math.PI/2.8,0,.36]}><ringGeometry args={[2.25,2.61,40]} /><meshBasicMaterial color="#9acde5" side={DoubleSide} transparent opacity={.59} depthWrite={false} /></mesh>
    </Drift>
    <Pieces pieces={[[[0,-.43,0],[16.45,.83,12.35]],[[0,-.93,0],[15.62,.32,11.55]],[[-8,.43,0],[.38,.96,10.65]]]} color="#263d59" />
    <Pieces pieces={Array.from({length:8},(_,i):Piece=>[[-7.14+i*2.04,-.07,.16],[2.012,.13,11.2]])} color="#bccbd8" />
    <Pieces pieces={[...windowFrames,...windowBeams, ...[-4.35,-.14,4.1].flatMap((z):Piece[]=>[
      [[-8.08,1.71,z],[.24,3.47,.27],[0,0,-.21]],[[-7.74,3.42,z],[.89,.27,.27],[0,0,.38]],
    ]),[[-7.54,3.54,-.15],[.27,.22,9.29]]]} color="#dde6ec" shadow />
    {windowFrames.slice(0,-1).map(([[x,,z]],i)=>{
      const [nextX,,nextZ]=windowFrames[i+1][0];
      const width=Math.hypot(nextX-x,nextZ-z);
      return <mesh key={x} position={[(x+nextX)/2,1.8,(z+nextZ)/2-.07]} rotation={[0,-Math.atan2(nextZ-z,nextX-x),0]}>
        <planeGeometry args={[width,3.4]} /><meshBasicMaterial color="#86c8ec" transparent opacity={.075} depthWrite={false} side={DoubleSide} />
      </mesh>;
    })}
    <Pieces pieces={[[[0,-.23,6.19],[15.95,.041,.024]],[[8.23,-.23,0],[.024,.041,11.81]],[[2.18,.009,.08],[.055,.025,10.6]],[[1.98,.008,.08],[.024,.021,10.6]]]} color="#5ad4fb" glow />
    <Pieces pieces={[[[-7.32,.77,-3.4],[.7,1.49,1.55]],[[-7.32,.77,-.82],[.7,1.49,1.55]],[[7.24,.44,-4.37],[.8,.89,2.15]]]} color="#6c8399" shadow />
    <Pieces pieces={[[[-6.96,.95,-3.4],[.026,.55,1.24]],[[-6.96,.95,-.82],[.026,.55,1.24]]]} color="#162f4b" />
    <Drift at={[0,0,0]} speed={1.1} motion={motion} update={(g,wave)=>{g.scale.y=1+wave*.04;}}>
      <Pieces pieces={[-3.4,-.82].flatMap((z):Piece[]=>[
        [[-6.93,1.03,z],[.025,.06,.84]], [[-6.93,.85,z-.15],[.025,.05,.53]],
      ])} color="#68ecf3" glow />
    </Drift>
    <Pieces pieces={[[[7.69,.52,2.5],[.37,1.05,3.15]],[[7.68,1.015,2.5],[.38,.085,2.89]]]} color="#e0e9f0" shadow />
    <pointLight position={[6,2.75,-3.7]} color="#73dfff" intensity={6} distance={7} />
  </group>;
}
