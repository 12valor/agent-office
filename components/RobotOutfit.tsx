'use client';

import { BoxGeometry, ExtrudeGeometry, MeshStandardMaterial, Shape } from 'three';
import { lazy, Suspense } from 'react';
import { loadBeachTheme, loadThemeWear } from './officeThemes';
import type { OutfitPart } from './ThemeWear';
import type { OutfitId } from './officeThemes';

const trimGeometry = new BoxGeometry();
const fabric = new MeshStandardMaterial({color:'#247e78',roughness:.92});
const collar = new MeshStandardMaterial({color:'#d5f1e9',roughness:.85});
const badge = new MeshStandardMaterial({color:'#f2eee0',roughness:.71});
const badgeInk = new MeshStandardMaterial({color:'#336e70',roughness:.82});

function panel(points: [number,number][], depth:number) {
  const shape=new Shape();
  shape.moveTo(...points[0]);
  for(const [x,y] of points.slice(1)) shape.lineTo(x,y);
  shape.closePath();
  return new ExtrudeGeometry(shape,{depth,bevelEnabled:false});
}

// The two panels leave the robot's central status indicator visible.
const front = panel([[.075,.409],[.197,.409],[.252,.356],[.253,.125],[.220,.066],[.055,.066],[.055,.151],[.154,.151],[.154,.294]],.014);
const lapel = panel([[.076,.406],[.130,.403],[.161,.310],[.120,.337]],.006);

type Point=[number,number,number];
function Trim({at,size,material}: {at:Point;size:Point;material:MeshStandardMaterial}) {
  return <mesh geometry={trimGeometry} material={material} position={at} scale={size} />;
}

function OfficeVest() {
  return <group name="Office vest" dispose={null}>
    {[-1,1].map(side=><group key={side} scale={[side,1,1]}>
      <mesh geometry={front} material={fabric} position={[0,0,.197]} />
      <mesh geometry={lapel} material={collar} position={[0,0,.214]} />
      <Trim at={[.252,.204,.039]} size={[.023,.259,.27]} material={fabric} />
    </group>)}
    <Trim at={[.203,.353,.219]} size={[.065,.052,.010]} material={badge} />
    <Trim at={[.203,.360,.225]} size={[.037,.007,.004]} material={badgeInk} />
    <Trim at={[.203,.344,.225]} size={[.026,.005,.004]} material={badgeInk} />
  </group>;
}

const TropicalWear=lazy(()=>loadBeachTheme().then(module=>({default:module.BeachWear})));

const AdditionalWear=lazy(loadThemeWear);

export function RobotOutfit({id,part='torso',inspecting=false}: {id:OutfitId;part?:OutfitPart;inspecting?:boolean}) {
  if(id==='beach') return <Suspense fallback={null}><TropicalWear part={part} inspecting={inspecting} /></Suspense>;
  if(id==='office') return part==='torso'?<OfficeVest />:null;
  return <Suspense fallback={null}><AdditionalWear id={id} part={part} inspecting={inspecting} /></Suspense>;
}
