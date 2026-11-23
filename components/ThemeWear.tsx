import { BoxGeometry, CylinderGeometry, MeshBasicMaterial, MeshStandardMaterial, SphereGeometry } from 'three';
import type { OutfitId } from './officeThemes';
import type { Point } from './ThemeScenery';

export type OutfitPart = 'torso' | 'head' | 'foot';
type NewOutfit = Exclude<OutfitId,'office'|'beach'>;
const box = new BoxGeometry();
const crown = new CylinderGeometry(.45,.5,1,10);
const visor = new SphereGeometry(.5,16,9,0,Math.PI,.35,2.44);
const visorTint = new MeshBasicMaterial({color:'#9edcef',transparent:true,opacity:.14,depthWrite:false});
const fabric = (color:string) => new MeshStandardMaterial({color,roughness:.88});
const outfits = {
  cyberpunk: { body:fabric('#1d2431'), trim:fabric('#57e4ed'), detail:fabric('#465879') },
  cozy: { body:fabric('#30563c'), trim:fabric('#a9bd79'), detail:fabric('#79513b') },
  astronaut: { body:fabric('#e0edf0'), trim:fabric('#4095af'), detail:fabric('#283d58') },
};

function Accent({ at, size, material, round = false, angle = 0 }: {
  at:Point; size:Point; material:MeshStandardMaterial; round?:boolean; angle?:number;
}) {
  return <mesh position={at} scale={size} rotation={[0,0,angle]} geometry={round?crown:box} material={material} />;
}

export default function ThemeWear({ id, part, inspecting }: {id:NewOutfit;part:OutfitPart;inspecting:boolean}) {
  const {body,trim,detail}=outfits[id];
  if (part==='foot') return <group dispose={null}>
    <Accent at={[0,-.038,.046]} size={[.166,.076,.20]} material={id==='cozy'?detail:body} />
    <Accent at={[0,-.071,.047]} size={[.168,.014,.201]} material={trim} />
    <Accent at={[0,.003,.075]} size={[.141,.015,.030]} material={id==='cozy'?body:detail} />
  </group>;
  if (part==='head') return <group dispose={null}>
    {id==='cyberpunk' && [-1,1].map(side=><group key={side}>
      <Accent at={[side*.397,.006,-.008]} size={[.041,.165,.174]} material={body} />
      <Accent at={[side*.417,.030,.008]} size={[.012,.035,.102]} material={trim} />
    </group>)}
    {id==='cozy' && <>
      <Accent at={[-.064,.255,-.034]} size={[.50,.085,.407]} material={trim} round />
      <Accent at={[-.086,.327,-.041]} size={[.43,.094,.344]} material={body} round angle={.09} />
      <Accent at={[-.10,.389,-.042]} size={[.11,.081,.10]} material={trim} round />
    </>}
    {id==='astronaut' && <>
      {!inspecting && <mesh geometry={visor} material={visorTint} scale={[.865,.66,.69]} />}
      <Accent at={[0,.235,-.112]} size={[.618,.11,.34]} material={body} round />
      {[-1,1].map(side=><group key={side}>
        <Accent at={[side*.344,.143,-.12]} size={[.093,.22,.22]} material={body} angle={side*.18} />
        <Accent at={[side*.399,.018,.001]} size={[.045,.175,.185]} material={trim} />
      </group>)}
    </>}
  </group>;
  return <group dispose={null}>
    {[-1,1].map(side=><group key={side} scale={[side,1,1]}>
      <Accent at={[.204,.254,.189]} size={[.107,.303,.062]} material={body} angle={-.055} />
      <Accent at={[.138,.351,.213]} size={[.116,.112,.038]} material={body} angle={-.24} />
      <Accent at={[.211,.325,.228]} size={[.063,.018,.014]} material={trim} angle={-.24} />
      <Accent at={[.217,.137,.215]} size={[.07,.016,.016]} material={detail} />
    </group>)}
    <Accent at={[0,.081,.182]} size={[.435,.052,.060]} material={body} />
    <Accent at={[0,.114,.209]} size={[.23,.017,.019]} material={trim} />
    {id==='cozy' && <Accent at={[0,.369,-.160]} size={[.332,.127,.133]} material={body} round />}
    {id==='astronaut' && <>
      <Accent at={[0,.263,-.231]} size={[.32,.261,.108]} material={body} />
      <Accent at={[0,.282,-.289]} size={[.23,.05,.019]} material={trim} />
    </>}
  </group>;
}
