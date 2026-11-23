import assert from 'node:assert/strict';
import test from 'node:test';
import { createRobotMotion, legPose, loungeChair, loungeRoute, robotPose, routePosition, stepRobot } from '../components/robotMotion.ts';

const route=loungeRoute(0,[-5.25,-.67]);
const frame=1/60;

test('seated boots and shins clear the fronts of the sofa and chairs',()=>{
  for(const [surface,front,seatTop] of [['sofa',.60,.37],['chair',.415,.34],['desk',.33,.335]]) {
    for(const sway of [-.19,0,.19]) {
      const pose=legPose(surface,1,0,0,0,sway);
      assert.ok(pose.kneeZ-.07>front && pose.ankleZ-.07>front);
      assert.ok(pose.ankleY-.0775<.05);
      assert.ok(pose.hipY>seatTop && pose.kneeY>=seatTop);
    }
  }
});

test('the fourth worker rests at chair height and faces the lounge table',()=>{
  const chairRoute=loungeRoute(3,[-5.25,2.48]);
  const robot=createRobotMotion();
  stepRobot(robot,chairRoute,'rest',frame,false);
  assert.equal(robot.yaw,loungeChair.yaw);
  assert.equal(chairRoute.restHeight,loungeChair.height);
  const position=routePosition(chairRoute,robot.distance,1);
  assert.deepEqual([position.x,position.z],loungeChair.position);
});
function until(robot,intent,phase,{animate=true}={}) {
  const visited=[];
  for(let i=0;i<1500 && robot.phase!==phase;i++) {
    const previous=robot.distance;
    stepRobot(robot,route,intent,frame,animate);
    if(visited.at(-1)!==robot.phase) visited.push(robot.phase);
    if(animate) assert.ok(Math.abs(previous-robot.distance) <= .077,'movement must stay within sprint speed');
  }
  assert.equal(robot.phase,phase);
  return visited;
}

test('rests, reacts, runs to its desk, works, celebrates, and walks back',()=>{
  const robot=createRobotMotion(()=>.83);
  const curious=createRobotMotion(()=>.2);
  let stretch=false,blink=false;
  let lookedAround=false;
  for(let i=0;i<800;i++) {
    stepRobot(robot,route,'rest',frame,true);
    stepRobot(curious,route,'rest',frame,true);
    lookedAround ||= Math.abs(robotPose(curious,false,true).lookY)>.25;
    const pose=robotPose(robot,false,true);
    stretch ||= pose.left < -1.6 && pose.right < -1.6;
    blink ||= pose.eyes < .2;
  }
  assert.ok(stretch && blink && lookedAround);
  assert.deepEqual(until(robot,'work','WORKING'),['REACT','STAND','SPRINT','DESK_SIT','WORKING']);
  assert.equal(robot.distance,route.length);
  assert.notEqual(robotPose(robot,true,true).left,robotPose(robot,true,true).right);
  assert.deepEqual(until(robot,'finish','COUCH_IDLE'),['FINISH','STAND','WALK_TO_COUCH','COUCH_SIT','COUCH_IDLE']);
  assert.equal(robot.distance,0);
});

test('a returning worker reverses from its current location and can hold on disconnection',()=>{
  const robot=createRobotMotion(()=>.3);
  until(robot,'work','WORKING');
  until(robot,'finish','WALK_TO_COUCH');
  for(let i=0;i<70;i++) stepRobot(robot,route,'rest',frame,true);
  const distance=robot.distance;
  const first=until(robot,'work','WORKING');
  assert.equal(first[0],'SPRINT');
  assert.ok(distance>0 && distance<route.length);
  until(robot,'finish','WALK_TO_COUCH');
  const before=robot.distance;
  until(robot,'hold','HOLD');
  assert.equal(robot.distance,before);
  assert.equal(robotPose(robot,false,true).moving,false);
  until(robot,'rest','COUCH_IDLE');
});

test('keeps finite poses over two hours of simulated activity and repeated turns',()=>{
  let seed=191;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
  const robot=createRobotMotion(random);
  const phases=new Set();
  for(let i=0;i<7200*30;i++) {
    const second=(i/30)%44;
    const intent=second<19?'rest':second<31?'work':'finish';
    stepRobot(robot,route,intent,1/30,true);
    if(i%30===0) {
      phases.add(robot.phase);
      assert.ok(Object.values(routePosition(route,robot.distance,robot.pace)).every(Number.isFinite));
      assert.ok(Number.isFinite(robotPose(robot,true,true).left));
    }
  }
  assert.ok(phases.has('COUCH_IDLE') && phases.has('SPRINT') && phases.has('WORKING') && phases.has('WALK_TO_COUCH'));
});

test('reduced motion picks a still pose without passing through the sprint',()=>{
  const robot=createRobotMotion();
  assert.deepEqual(until(robot,'work','WORKING',{animate:false}),['WORKING']);
  assert.deepEqual(until(robot,'finish','COUCH_IDLE',{animate:false}),['COUCH_IDLE']);
  assert.equal(robotPose(robot,false,false).breath,0);
});
