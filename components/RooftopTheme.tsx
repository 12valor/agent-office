import { DataTexture, RGBAFormat } from 'three';
import type { PointLight } from 'three';
import { Drift, Pieces, type Piece } from './ThemeScenery';

const hazeSize=32;
const hazePixels=new Uint8Array(hazeSize*hazeSize*4);
for(let y=0;y<hazeSize;y++)for(let x=0;x<hazeSize;x++){
  const fade=Math.sin(Math.PI*x/(hazeSize-1))*Math.sin(Math.PI*y/(hazeSize-1));
  hazePixels.set([255,255,255,Math.round(65*fade)],4*(y*hazeSize+x));
}
const haze=new DataTexture(hazePixels,hazeSize,hazeSize,RGBAFormat);
haze.needsUpdate=true;
const skyline: Piece[] = Array.from({length:18}, (_, i) => {
  const x = -27+i*2.65;
  const height = 3.2+(i*17%11)*.65;
  return [[x,height/2-6.3,-10.5-(i*13%5)*1.55],[1.55+(i%4)*.24,height,1.55]];
});
const windows: Piece[] = skyline.flatMap(([[x,y,z],[width,height,depth]],i) =>
  Array.from({length:Math.floor(height/.55)},(_,row):Piece => [
    [x,y-height/2+.31+row*.55,z+depth/2+.012], [width*(row%3===i%3?.76:.48),.05,.025],
  ]));
const pillars: Piece[] = Array.from({length:8},(_,i)=>[[-8+i*2.28,.56,-5.95],[.09,1.12,.10]]);
const sidePillars: Piece[] = Array.from({length:6},(_,i)=>[[-8,.56,-5.95+i*2.28],[.10,1.12,.09]]);
const deck: Piece[] = Array.from({length:15},(_,i)=>[[-7.5+i*1.07,-.08,0],[1.054,.13,12]]);

export default function RooftopTheme({ motion }: {motion:boolean}) {
  return <group name="Cyberpunk rooftop">
    <Pieces pieces={skyline} color="#342f58" />
    <Drift at={[0,0,0]} speed={1.25} motion={motion} update={(g,wave)=>{g.visible=wave>-.84;}}>
      <Pieces pieces={windows.filter((_,i)=>i%4===0)} color="#ff7bd4" glow />
    </Drift>
    <Pieces pieces={windows.filter((_,i)=>i%4!==0)} color="#758deb" glow />
    <Drift at={[-2,-2,-11]} speed={.23} motion={motion} update={(g,wave)=>{g.position.x=-2+wave*.9;}}>
      <mesh rotation={[-Math.PI/2,0,0]}><planeGeometry args={[46,18]} /><meshBasicMaterial color="#a4a0d9" map={haze} transparent opacity={.72} depthWrite={false} /></mesh>
    </Drift>
    <Pieces pieces={[[[0,-.72,0],[16.65,1.15,12.1]],[[0,-1.65,0],[15.85,1,11.3]]]} color="#23263d" />
    <Pieces pieces={deck} color="#414762" />
    <Pieces pieces={[...pillars,...sidePillars, ...[.49,1.04].flatMap((y):Piece[]=>[
      [[0,y,-5.95],[16.2,.06,.08]],[[-8,y,-.22],[.08,.06,11.5]],
    ])]} color="#647690" />
    <Pieces pieces={[[[0,-.42,6.04],[16.45,.045,.03]],[[8.24,-.42,0],[.03,.045,12.1]],[[2.18,.005,.21],[.035,.014,11.2]]]} color="#69f1f4" glow />
    <Pieces pieces={[[[-6.75,.57,-5.35],[1.66,1.11,.8]],[[7.25,.42,-5.05],[.93,.82,1.05]],[[7.3,.13,5.35],[1.15,.26,.54]]]} color="#53647e" shadow />
    <Pieces pieces={Array.from({length:6},(_,i):Piece=>[[-6.75,.25+i*.13,-4.94],[1.39,.044,.055]])} color="#262a42" />
    <group position={[1.5,1.3,-5.79]}>
      <Pieces pieces={[[[0,0,0],[2.65,1.05,.14]],[[0,-.78,0],[.13,1,.12]]]} color="#20233f" />
      <Drift at={[0,0,.085]} speed={.9} motion={motion} update={(g,wave)=>{g.scale.x=1+wave*.025;}}>
        <Pieces pieces={[[[-.77,0,0],[.38,.38,.06],[0,0,Math.PI/4]],[[.1,.2,0],[.89,.052,.05]],[[.48,0,0],[1.12,.052,.05]],[[.49,-.2,0],[.65,.052,.05]]]} color="#f686ed" glow />
      </Drift>
    </group>
    <Drift at={[1.5,2,-4.7]} speed={.67} motion={motion} update={(g,wave)=>{(g.children[0] as PointLight).intensity=9+wave*2;}}>
      <pointLight color="#ba5aff" intensity={9} distance={7} />
    </Drift>
  </group>;
}
