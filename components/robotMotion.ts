export type AnimationPhase = 'COUCH_IDLE' | 'REACT' | 'STAND' | 'SPRINT' | 'DESK_SIT' | 'WORKING' | 'FINISH' | 'WALK_TO_COUCH' | 'COUCH_SIT' | 'HOLD';
export type Intent = 'work' | 'rest' | 'finish' | 'hold';
type Point = [number, number];
export const loungeChair = {position:[3.47,3.66] as Point, height:.40, yaw:Math.PI/2};
export type RestLocation = {position:Point; height:number; yaw:number; exitZ:number};
export const officeRestLocations:RestLocation[] = Array.from({length:9},(_,seat) => {
  if(seat===3) return {...loungeChair,exitZ:loungeChair.position[1]+.76};
  const z=seat<3?2.05:seat<6?4.7:5.25;
  return {position:[3.86+(seat%3)*.98,z],height:seat<3?.46:.15,yaw:0,exitZ:seat<3?2.87:z};
});
type Gesture = 'look' | 'legs' | 'shift' | 'stretch' | 'sleep' | 'scan' | 'burst';
const idleGestures: [Gesture, number, number][] = [['look',5,1.8],['legs',3,1.5],['shift',3,1.4],['stretch',2,2.2],['sleep',1,2.9]];
const workGestures: [Gesture, number, number][] = [['scan',5,1.6],['burst',4,1.2],['shift',2,1.5]];

export function loungeRoute(seat: number, desk: Point, locations=officeRestLocations) {
  const location=locations[seat]??officeRestLocations[0];
  const rest=location.position;
  const approach = Math.min(desk[1]+.71,5.48);
  const aisle=location.exitZ;
  const points: Point[] = [rest,[rest[0],aisle],[2.19,aisle],[2.19,approach],[desk[0],approach],desk];
  const corners = points.filter((point,i)=>i===0 || point[0]!==points[i-1][0] || point[1]!==points[i-1][1]);
  const path = corners.flatMap((point,i):Point[] => {
    if(i===0 || i===corners.length-1) return [point];
    const near=(adjacent:Point):Point=>{
      const dx=adjacent[0]-point[0], dz=adjacent[1]-point[1];
      const radius=Math.min(.36,.16/Math.hypot(dx,dz));
      return [point[0]+dx*radius,point[1]+dz*radius];
    };
    const start=near(corners[i-1]), end=near(corners[i+1]);
    return [start,[.25*start[0]+.5*point[0]+.25*end[0],.25*start[1]+.5*point[1]+.25*end[1]],end];
  });
  const segments = path.slice(1).flatMap((end,i) => {
    const from = path[i];
    const length = Math.hypot(end[0]-from[0],end[1]-from[1]);
    return length > .001 ? [{from,end,length,yaw:Math.atan2(end[0]-from[0],end[1]-from[1])}] : [];
  });
  return {segments,length:segments.reduce((total,segment)=>total+segment.length,0),rest,desk,
    restHeight:location.height,restYaw:location.yaw};
}

export type Route = ReturnType<typeof loungeRoute>;
export function routePosition(route: Route, distance: number, direction: number) {
  for (const segment of route.segments) {
    if (distance <= segment.length) {
      const portion = Math.max(0,distance / segment.length);
      return {x:segment.from[0]+(segment.end[0]-segment.from[0])*portion,z:segment.from[1]+(segment.end[1]-segment.from[1])*portion,yaw:segment.yaw+(direction < 0 ? Math.PI : 0)};
    }
    distance -= segment.length;
  }
  return {x:route.desk[0],z:route.desk[1],yaw:Math.PI};
}

export const clamp = (value:number) => Math.max(0,Math.min(1,value));
export type SeatKind = 'sofa' | 'chair' | 'desk' | 'floor';
const seats = {
  sofa: { hipY:.46, hipZ:.46, kneeY:.43, kneeZ:.685, ankleZ:.70 },
  chair: { hipY:.40, hipZ:.28, kneeY:.39, kneeZ:.495, ankleZ:.52 },
  desk: { hipY:.42, hipZ:.21, kneeY:.405, kneeZ:.42, ankleZ:.44 },
  floor: { hipY:.15, hipZ:0, kneeY:.22, kneeZ:.20, ankleZ:.36 },
};

export function legPose(seat:SeatKind, sit:number, lift:number, stepZ:number, footLift:number, idleShift:number) {
  const rest=seats[seat];
  const seated=clamp(sit);
  const mix=(a:number,b:number)=>a+(b-a)*seated;
  const walkingHip=.365+lift;
  const walkingAnkle=.078+footLift;
  const vertical=walkingHip-walkingAnkle;
  const upper=.175, lower=.157;
  const reach=Math.min(upper+lower-.001,Math.max(.03,Math.hypot(vertical,stepZ)));
  const kneeAngle=Math.acos(Math.min(1,Math.max(-1,(reach*reach-upper**2-lower**2)/(2*upper*lower))));
  const thigh=-Math.atan2(stepZ,vertical)-Math.atan2(lower*Math.sin(kneeAngle),upper+lower*Math.cos(kneeAngle));
  return {
    hipY:mix(walkingHip,rest.hipY),hipZ:mix(0,rest.hipZ),
    kneeY:mix(walkingHip-upper*Math.cos(thigh),rest.kneeY),kneeZ:mix(-upper*Math.sin(thigh),rest.kneeZ),
    ankleY:mix(walkingAnkle,seat==='desk'?.098:.118),ankleZ:mix(stepZ,rest.ankleZ + Math.max(-.008,Math.min(.025,idleShift))),
  };
}
const smooth = (value:number) => {const t=clamp(value);return t*t*(3-2*t);};
const approach = (a:number,b:number,rate:number,dt:number) => b+(a-b)*Math.exp(-rate*dt);

export function createRobotMotion(random = Math.random) {
  return {phase:'COUCH_IDLE' as AnimationPhase, t:0,clock:0,distance:0,pace:0,gait:0,sit:1,yaw:0,
    outbound:true,travelled:false, untilGesture:2+random()*4, gesture:'look' as Gesture,
    gestureStart:0,gestureDuration:0, lookSign:1, blinkAt:1+random()*4, restClock:true, random};
}
export type RobotMotion = ReturnType<typeof createRobotMotion>;

function enter(robot:RobotMotion, phase:AnimationPhase) {
  robot.phase=phase;
  robot.t=0;
}

export function stepRobot(robot:RobotMotion, route:Route, intent:Intent, seconds:number, animate:boolean) {
  const dt=Math.min(.05,Math.max(0,seconds));
  if (intent==='hold') {
    if(robot.phase!=='HOLD') enter(robot,'HOLD');
    robot.pace=0;
    return;
  }
  if (!animate) {
    robot.distance=intent==='work' ? route.length : 0;
    robot.sit=1;
    robot.yaw=intent==='work' ? Math.PI : route.restYaw;
    robot.pace=0;
    enter(robot,intent==='work' ? 'WORKING' : 'COUCH_IDLE');
    return;
  }
  robot.t+=dt;
  robot.clock+=dt;
  const atCouch=robot.distance<.002;
  const atDesk=robot.distance>=route.length-.002;
  if (robot.phase==='HOLD') {
    if (intent==='work' && atDesk) enter(robot,'WORKING');
    else if(intent!=='work' && atCouch) enter(robot,'COUCH_IDLE');
    else {
      robot.outbound=intent==='work';
      enter(robot,atCouch && robot.outbound ? 'REACT' : 'STAND');
    }
  } else if (intent==='work') {
    if (robot.phase==='COUCH_IDLE' || robot.phase==='COUCH_SIT') {
      robot.outbound=true;
      enter(robot,'REACT');
    } else if(robot.phase==='WALK_TO_COUCH' || (robot.phase==='STAND' && !robot.outbound)) {
      robot.outbound=true;
      enter(robot,'SPRINT');
    } else if(robot.phase==='FINISH') enter(robot,'WORKING');
  } else {
    if (robot.phase==='WORKING' || robot.phase==='DESK_SIT') enter(robot,'FINISH');
    else if(robot.phase==='SPRINT' || (robot.phase==='STAND' && robot.outbound)) {
      robot.outbound=false;
      enter(robot,atCouch ? 'COUCH_SIT' : 'WALK_TO_COUCH');
    } else if(robot.phase==='REACT') enter(robot,'COUCH_IDLE');
  }

  switch(robot.phase) {
    case 'REACT':
      if(robot.t>=.19) {robot.outbound=true;enter(robot,'STAND');}
      break;
    case 'STAND':
      robot.sit=approach(robot.sit,0,13,dt);
      if(robot.t>=.34) enter(robot,robot.outbound?'SPRINT':'WALK_TO_COUCH');
      break;
    case 'SPRINT':
    case 'WALK_TO_COUCH': {
      const sign=robot.phase==='SPRINT'?1:-1;
      const remaining=sign>0?route.length-robot.distance:robot.distance;
      const speed=sign>0?4.5:1.85;
      const goal=sign*Math.min(speed,.35+Math.sqrt(8*remaining));
      const previous=robot.distance;
      robot.pace=approach(robot.pace,goal,10,dt);
      robot.distance=Math.min(route.length,Math.max(0,previous+robot.pace*dt));
      robot.gait+=Math.abs(robot.distance-previous);
      robot.sit=approach(robot.sit,0,15,dt);
      if((sign>0 && robot.distance>=route.length)||(sign<0 && robot.distance<=0)) {
        robot.pace=0;
        enter(robot,sign>0?'DESK_SIT':'COUCH_SIT');
      }
      break;
    }
    case 'DESK_SIT':
    case 'COUCH_SIT':
      robot.sit=approach(robot.sit,1,9,dt);
      if(robot.t>=.51) enter(robot,robot.phase==='DESK_SIT'?'WORKING':'COUCH_IDLE');
      break;
    case 'FINISH':
      if(robot.t>=(intent==='finish'?.87:.45)) {robot.outbound=false;enter(robot,'STAND');}
      break;
    case 'COUCH_IDLE':
    case 'WORKING':
      robot.sit=approach(robot.sit,1,10,dt);
      break;
  }

  const moving=robot.phase==='SPRINT'||robot.phase==='WALK_TO_COUCH';
  const heading=moving?routePosition(route,robot.distance,robot.pace|| (robot.outbound?1:-1)).yaw
    : robot.phase==='STAND'?routePosition(route,robot.distance,robot.outbound?1:-1).yaw
    : robot.distance>route.length-.002 ? Math.PI : route.restYaw;
  robot.yaw+=Math.atan2(Math.sin(heading-robot.yaw),Math.cos(heading-robot.yaw))*(1-Math.exp(-dt*13));

  if(robot.clock>robot.blinkAt+.14) robot.blinkAt=robot.clock+2+robot.random()*5;
  const resting=robot.phase==='COUCH_IDLE';
  if(resting!==robot.restClock) {
    robot.gestureDuration=0;
    robot.untilGesture=robot.clock+1+robot.random()*3;
    robot.restClock=resting;
  }
  if((resting||robot.phase==='WORKING')&&robot.clock>=robot.untilGesture) {
    const table=resting?idleGestures:workGestures;
    let draw=robot.random()*table.reduce((total,[,weight])=>total+weight,0);
    const [gesture,,duration]=table.find(([,weight])=>(draw-=weight)<0)??table[0];
    robot.gesture=gesture;
    robot.gestureStart=robot.clock;
    robot.gestureDuration=duration;
    robot.lookSign=robot.random()<.5?-1:1;
    robot.untilGesture=robot.clock+duration+1.4+robot.random()*5.5;
  }
}

export function robotPose(robot:RobotMotion, coding:boolean, animate:boolean) {
  const moving=robot.phase==='SPRINT'||robot.phase==='WALK_TO_COUCH';
  const sprint=robot.phase==='SPRINT';
  const stride=sprint?.43:.26;
  const cycle=robot.gait/stride;
  const wave=Math.sin(cycle*Math.PI*2);
  const gesture=robot.gestureDuration>0?clamp((robot.clock-robot.gestureStart)/robot.gestureDuration):1;
  const envelope=animate?Math.sin(gesture*Math.PI)**2:0;
  const blink=animate?Math.max(0,1-Math.abs(robot.clock-robot.blinkAt-.064)/.064):0;
  const desk=robot.phase==='WORKING';
  const lounge=robot.phase==='COUCH_IDLE';
  const finish=robot.phase==='FINISH';
  const typing=desk&&coding&&robot.gesture!=='scan'?1:desk&&coding?1-envelope:0;
  const fast=robot.gesture==='burst'?envelope:0;
  const hand=robot.clock*13+fast*1.7*Math.sin(robot.clock*9);
  const stretch=lounge&&robot.gesture==='stretch'?envelope:0;
  const shift=robot.gesture==='shift'?envelope:0;
  const asleep=lounge&&robot.gesture==='sleep'?envelope:0;
  const cheer=finish&&animate?Math.sin(Math.PI*clamp((robot.t-.12)/.6))**2:0;
  const react=robot.phase==='REACT'?1-smooth(robot.t/.19)*.4:0;
  return {
    moving,sprint, stride,cycle,
    lift:moving?Math.abs(wave)*(sprint?.032:.016):0,
    lean:moving?(sprint?.23:.07):desk?-.075*typing:0,
    breath:animate&&robot.phase!=='HOLD'?Math.sin(robot.clock*2.5)*.014:0,
    eyes:Math.max(.07,1-.91*Math.max(blink,asleep)+.35*react),
    lookY:lounge&&robot.gesture==='look' ? robot.lookSign*envelope*.52 : desk?robot.lookSign*envelope*(robot.gesture==='scan'?.56:.11):finish?.22:0,
    lookX:asleep*.35+(finish?.14:0),
    roll:shift*robot.lookSign*.08,
    legSwing:lounge&&robot.gesture==='legs'?envelope*Math.sin(robot.clock*5)*.19:0,
    left:moving ? wave*(sprint?.86:.45) : -stretch*2.6-cheer*1.8+shift*.25 + (animate?typing*(-.78+Math.sin(hand)*.14):-.78*typing),
    right:moving ? -wave*(sprint?.86:.45) : -stretch*2.6-cheer*1.8-shift*.25 + (animate?typing*(-.78+Math.sin(hand+2.4)*.14):-.78*typing),
  };
}
