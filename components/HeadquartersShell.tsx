import { DoubleSide } from 'three';
import { Pieces, type Piece, type Point } from './ThemeScenery';

const windowHeight = 3.58;
const slab: Piece[] = [
  [[0,-.20,0],[16.3,.4,11.35]],
  [[0,-1.89,0],[16.3,.14,11.35]],
  [[0,-.50,0],[16.24,.14,11.27]],
];
const columns: Piece[] = [
  [[-7.89,1.80,-5.44],[.39,3.6,.39]],
  [[7.89,1.80,-5.44],[.35,3.6,.35]],
  [[-7.89,1.80,5.44],[.35,3.6,.35]],
  [[-2.65,1.80,-5.46],[4.46,3.6,.21]],
];

function CurtainWall({ at, width, bays, turn = 0 }: {at:Point; width:number; bays:number; turn?:number}) {
  const mullions: Piece[] = Array.from({length:bays+1},(_,i)=>[
    [-width/2+i*width/bays,windowHeight/2-.025,0],[.085,windowHeight-.27,.11],
  ]);
  return <group position={at} rotation={[0,turn,0]}>
    <Pieces pieces={mullions} color="#537a87" />
    <Pieces pieces={[[[0,.07,0],[width,.14,.18]],[[0,windowHeight-.11,0],[width,.22,.26]]]} color="#cbd9df" />
    <mesh position={[0,windowHeight/2,-.029]}>
      <planeGeometry args={[width-.10,windowHeight-.17]} />
      <meshBasicMaterial color="#b4deee" transparent opacity={.17} depthWrite={false} side={DoubleSide} />
    </mesh>
  </group>;
}

const facadeMullions: Piece[] = [
  ...Array.from({length:13},(_,i):Piece=>[[-8+i*1.33,-1.09,5.65],[.08,1.65,.12]]),
  ...Array.from({length:9},(_,i):Piece=>[[8.12,-1.09,-5.52+i*1.38],[.12,1.65,.08]]),
];
const facadeGlass: Piece[] = [
  [[0,-1.12,5.60],[16.15,1.50,.12]],
  [[8.06,-1.12,0],[.12,1.50,11.16]],
];
const spandrels: Piece[] = [
  [[0,-1.55,5.69],[16.24,.15,.08]],
  [[8.13,-1.55,0],[.08,.15,11.26]],
  [[0,-.86,5.69],[16.24,.06,.08]],
  [[8.13,-.86,0],[.08,.06,11.26]],
];

const lowerFloors: Piece[] = Array.from({length:6},(_,i)=>(-1.98-i*.94)).flatMap((top):Piece[]=>[
  [[0,top-.46,5.51],[15.98,.86,.13]],
  [[7.98,top-.46,0],[.13,.86,11.05]],
]);
const lowerBands: Piece[] = Array.from({length:6},(_,i)=>(-1.98-i*.94)).flatMap((y):Piece[]=>[
  [[0,y,5.55],[16.07,.12,.14]],
  [[8.02,y,0],[.14,.12,11.13]],
]);
const lowerFrames: Piece[] = [
  ...Array.from({length:13},(_,i):Piece=>[[-7.95+i*1.32,-4.7,5.59],[.075,5.45,.09]]),
  ...Array.from({length:9},(_,i):Piece=>[[8.05,-4.7,-5.47+i*1.37],[.09,5.45,.075]]),
];

function cityRow(depth: number, spacing:number, count:number, base:number, tone: number) {
  const towers: Piece[] = [];
  const roofs: Piece[] = [];
  const windows: Piece[] = [];
  for(let i=0;i<count;i++) {
    const along=(i-(count-1)/2)*spacing+((i*13)%5-2)*.35;
    const distance=depth+(i*7)%5;
    const x=along*.76-distance*.65;
    const z=-along*.65-distance*.76;
    const width=1.34+((i*5+tone)%7)*.25;
    const length=width*.78+.24;
    const top=base+((i*17+tone)%9)*.36;
    const height=22+((i*3)%7)*.39;
    towers.push([[x,top-height/2,z],[width,height,length]]);
    if(i%3!==1) roofs.push([[x-.1,top+.17,z-.11],[width*.64,.34,length*.65]]);
    for(let floor=1;floor<=21;floor++){
      const y=top-floor*.37;
      windows.push([[x,y,z+length/2+.01],[width*.84,.067,.02]],[[x+width/2+.01,y,z],[.02,.067,length*.81]]);
    }
  }
  return {towers,roofs,windows};
}
const skyline=[
  { ...cityRow(38,3.05,20,-15.9,1), wall:'#aecbd8', trim:'#b8d0db' },
  { ...cityRow(27,3.45,16,-10.9,2), wall:'#8eb3c5', trim:'#acc6d2' },
  { ...cityRow(17.5,4.35,11,-5.6,3), wall:'#709bae', trim:'#95b7c5' },
];

export function HeadquartersShell() {
  return <group name="WSB headquarters">
    <group name="Business district">
      {skyline.map(({towers,roofs,windows,wall,trim})=><group key={wall}>
        <Pieces pieces={[...towers,...roofs]} color={wall} />
        <Pieces pieces={windows} color={trim} glow />
      </group>)}
    </group>
    <Pieces pieces={slab} color="#d4dee2" />
    <Pieces pieces={lowerFloors} color="#789fac" />
    <Pieces pieces={lowerBands} color="#b7cbd3" />
    <Pieces pieces={lowerFrames} color="#94b1be" />
    <Pieces pieces={facadeGlass} color="#507e91" />
    <Pieces pieces={facadeMullions} color="#9db8c3" />
    <Pieces pieces={spandrels} color="#274e5e" />
    <CurtainWall at={[0,0,-5.48]} width={16.0} bays={10} />
    <CurtainWall at={[-7.99,0,0]} width={11.0} bays={7} turn={Math.PI/2} />
    <Pieces pieces={columns} color="#afc4ca" shadow />
  </group>;
}
