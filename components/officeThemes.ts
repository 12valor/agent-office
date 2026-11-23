import { officeRestLocations } from './robotMotion';

type Point = [number,number,number];
const workstations:Point[]=[[-5.25,0,-1.7],[-2.25,0,-1.7],[.75,0,-1.7],[-5.25,0,1.45],[-2.25,0,1.45],[.75,0,1.45]];
const camera=(position:Point,width:number,height:number)=>({position,width,height});
const palette=(desk:string,legs:string,seat:string,frame:string)=>({desk,legs,seat,frame});

export const loadBeachTheme = () => import('./BeachTheme');
export const loadThemeWear = () => import('./ThemeWear');
const loadRooftop = () => Promise.all([import('./RooftopTheme'),loadThemeWear()]).then(([scene])=>scene);
const loadCabin = () => Promise.all([import('./CabinTheme'),loadThemeWear()]).then(([scene])=>scene);
const loadStation = () => Promise.all([import('./StationTheme'),loadThemeWear()]).then(([scene])=>scene);
export const officeThemes = {
  'standard-office': {
    label:'Standard Office', caption:'High-rise headquarters', preview:'/themes/standard.jpg', outfit:'office', load:null,
    workstations, resting:officeRestLocations,camera:camera([17,14,20],24,16.7), backdrop:'#c8e5ef',
    lights:{sky:'#f6ffff',ground:'#a7bec1',ambient:1.86,key:'#fff5e7',sun:2.45},
    palette:palette('#e7eee5','#25748a','#6eacb4','#285664'),
  },
  'tropical-beach': {
    label:'Tropical Beach', caption:'Island coworking', preview:'/themes/beach.jpg', outfit:'beach', load:loadBeachTheme,
    workstations, resting:officeRestLocations,camera:camera([19,16,24],28,18.9), backdrop:'#b5e3e2',
    lights:{sky:'#fff5dc',ground:'#9bcfd0',ambient:1.85,key:'#fff2ce',sun:2.6},
    palette:palette('#d8ab6d','#77583a','#479b8d','#956746'),
  },
  'cyberpunk-rooftop': {
    label:'Cyberpunk Rooftop', caption:'Night-shift coworking', preview:'/themes/rooftop.jpg', outfit:'cyberpunk', load:loadRooftop,
    workstations, resting:officeRestLocations,camera:camera([15,13,21],25.5,17.5), backdrop:'#1d1933',
    lights:{sky:'#c4c8ff',ground:'#535077',ambient:1.45,key:'#c6dcff',sun:1.9},
    palette:palette('#646e89','#2e324f','#682c6b','#323750'),
  },
  'forest-cabin': {
    label:'Forest Cabin', caption:'A woodland retreat', preview:'/themes/cabin.jpg', outfit:'cozy', load:loadCabin,
    workstations, resting:officeRestLocations,camera:camera([17,15,22],27,18), backdrop:'#304436',
    lights:{sky:'#fff0ca',ground:'#809164',ambient:1.75,key:'#ffe4bc',sun:2.25},
    palette:palette('#d4a66e','#83543c','#7e8561','#704d3e'),
  },
  'space-station': {
    label:'Space Station', caption:'An orbital research lab', preview:'/themes/station.jpg', outfit:'astronaut', load:loadStation,
    workstations, resting:officeRestLocations,camera:camera([15,12,22],25,17.2), backdrop:'#111d36',
    lights:{sky:'#d5f5ff',ground:'#63728e',ambient:1.65,key:'#ddecff',sun:2.05},
    palette:palette('#e3ecf0','#4a6f8a','#4b8ea7','#314761'),
  },
} as const;

export const defaultOfficeTheme = 'standard-office';
export type OfficeThemeId = keyof typeof officeThemes;
export type OutfitId = (typeof officeThemes)[OfficeThemeId]['outfit'];
export type OfficeTheme = (typeof officeThemes)[OfficeThemeId];
export const themeStorageKey='wsb-agent-office-theme';
export function readOfficeTheme(value:string|null):OfficeThemeId {
  return value&&Object.hasOwn(officeThemes,value)?value as OfficeThemeId:defaultOfficeTheme;
}
