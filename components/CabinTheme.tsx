import { Drift, Pieces, type Piece, type Point } from './ThemeScenery';

const trees: Point[] = [[-10,0,-6],[-9,0,-9],[-7,0,-10],[-4.8,0,-9],[-2,0,-11],[1,0,-9],[4,0,-10],[6.8,0,-8.4],[9.3,0,-7],[10,0,-4],[-10,0,-2.4],[-9.9,0,2],[10,0,3.8]];
const boughs: Piece[] = trees.flatMap(([x,,z],i)=>[0,1,2].map((row):Piece=>{
  const size = .85+(i%4)*.115;
  return [[x,(1.7+row*.88)*size,z],[(2.6-row*.62)*size,1.78*size,(2.6-row*.62)*size]];
}));
const boards: Piece[] = Array.from({length:21},(_,i)=>[[-7.86+i*.786,-.079,0],[.77,.14,12.35]]);
const logs: Piece[] = Array.from({length:9},(_,row)=>row).flatMap((row):Piece[]=>{
  const y=.19+row*.4;
  return row<3 || row===8 ? [[[0,y,-5.9],[16.15,.36,.34]],[[-8,y,-.55],[.36,.36,10.8]]] : [
    [[-6.4,y,-5.9],[3.3,.36,.34]],[[0,y,-5.9],[1.3,.36,.34]],[[6.45,y,-5.9],[3.2,.36,.34]],
    [[-8,y,-4.37],[.36,.36,3.17]],[[-8,y,3.3],[.36,.36,3.12]],
  ];
});

export default function CabinTheme({ motion }: {motion:boolean}) {
  return <group name="Forest cabin">
    <mesh position={[0,-.74,-1]} scale={[12,1,9.8]} castShadow receiveShadow><cylinderGeometry args={[1,1,.65,10]} /><meshStandardMaterial color="#556643" /></mesh>
    <Pieces pieces={trees.map(([x,,z])=>[[x,.54,z],[.33,1.6,.33]])} color="#765039" />
    <Drift at={[0,0,0]} speed={.72} motion={motion} update={(g,wave)=>{g.rotation.z=wave*.012;}}>
      <Pieces pieces={boughs.filter((_,i)=>i%3!==1)} color="#3a6950" tapered />
      <Pieces pieces={boughs.filter((_,i)=>i%3===1)} color="#497957" tapered />
    </Drift>
    <Pieces pieces={[[[0,-.28,0],[16.6,.36,12.44]],[[5.82,-.16,6.45],[4.54,.26,1.25]],[[5.82,-.36,7.05],[4.54,.18,.60]]]} color="#8d5b3c" />
    <Pieces pieces={boards.filter((_,i)=>i%3!==0)} color="#c68c55" />
    <Pieces pieces={boards.filter((_,i)=>i%3===0)} color="#b98051" />
    <Pieces pieces={logs} color="#a4744f" shadow />
    <Pieces pieces={[-4.8,-.66,.66,4.85].map(x=>[[x,2.05,-5.67],[.12,2.25,.14]])} color="#e1b184" />
    <Pieces pieces={[[[-2.7,2.06,-5.68],[4.24,.095,.12]],[[2.75,2.06,-5.68],[4.24,.095,.12]],[[-7.77,2.06,-.55],[.12,.095,4.65]],[[-7.77,2.09,-.55],[.12,2.20,.10]]]} color="#e1b184" />
    <Pieces pieces={[[[-7.38,1.28,1.32],[.80,2.55,1.55]],[[-6.96,.53,1.32],[.05,.86,1.00]],[[-6.82,2.15,1.32],[.63,.13,1.75]]]} color="#68524b" shadow />
    <Pieces pieces={[[[-6.95,.53,1.32],[.08,.71,.8]]]} color="#302a26" />
    <Drift at={[-6.88,.24,1.34]} speed={2.65} motion={motion} update={(g,wave)=>{g.scale.y=1+wave*.16;}}>
      <Pieces pieces={[[[.02,.34,.08],[.24,.66,.31]],[[.09,.22,-.18],[.19,.45,.25]]]} color="#ffb25e" glow tapered />
      <Pieces pieces={[[[.14,.16,.04],[.19,.32,.22]]]} color="#ffe6a0" glow tapered />
    </Drift>
    <pointLight position={[-6.65,.72,1.32]} color="#ff934c" intensity={8} distance={5} />
    <group position={[7.28,0,.33]} rotation={[0,-.3,0]}>
      <Pieces pieces={[[[0,1.06,-.27],[1.30,2.12,.11]],...[.07,.72,1.37,2.05].map((y):Piece=>[[0,y,0],[1.3,.105,.62]]),...[-.61,.61].map((x):Piece=>[[x,1.05,0],[.11,2.1,.62]])]} color="#845942" />
      {['#e5c283','#91ac82','#be775b'].map((color,i)=><Pieces key={color} color={color} pieces={[.12,.776,1.426].map((y,j)=>[[-.39+i*.34,y+.20,.038],[.16,.40-j*.025,.29],[0,0,(i===2?.13:0)]])} />)}
    </group>
    <Pieces pieces={[[[-5.98,1.16,-2.09],[.055,.29,.052]],[[-3.0,1.16,-2.09],[.055,.29,.052]],[[-.01,1.16,-2.09],[.055,.29,.052]]]} color="#59402e" />
    <Pieces pieces={[[[-5.98,1.32,-2.09],[.26,.16,.26]],[[-3.0,1.32,-2.09],[.26,.16,.26]],[[-.01,1.32,-2.09],[.26,.16,.26]]]} color="#ffda9b" glow tapered />
    <Drift at={[2.8,.35,-7.1]} speed={.35} motion={motion} update={(g,wave)=>{g.position.x=2.8+wave*1.7;}}>
      <Pieces pieces={[[[0,0,0],[.43,.41,.78]],[[.02,.27,.32],[.29,.33,.39]],[[0,.43,.26],[.15,.25,.12]]]} color="#b08463" tapered />
    </Drift>
  </group>;
}
