import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { BoxGeometry, ConeGeometry, Object3D, type Group, type InstancedMesh } from 'three';

export type Point = [number, number, number];
export type Piece = [position: Point, size: Point, rotation?: Point];
const cube = new BoxGeometry();
const cone = new ConeGeometry(.5, 1, 6);

export function Pieces({ pieces, color, glow = false, tapered = false, shadow = false }: {
  pieces: Piece[]; color: string; glow?: boolean; tapered?: boolean; shadow?: boolean;
}) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const batch = mesh.current;
    if (!batch) return;
    const transform = new Object3D();
    pieces.forEach(([position, scale, rotation], index) => {
      transform.position.set(...position);
      transform.scale.set(...scale);
      transform.rotation.set(...(rotation ?? [0, 0, 0]));
      transform.updateMatrix();
      batch.setMatrixAt(index, transform.matrix);
    });
    batch.instanceMatrix.needsUpdate = true;
    batch.computeBoundingSphere();
  }, [pieces]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, pieces.length]} castShadow={shadow} receiveShadow>
    <primitive object={tapered ? cone : cube} attach="geometry" dispose={null} />
    {glow ? <meshBasicMaterial color={color} /> : <meshStandardMaterial color={color} roughness={.85} />}
  </instancedMesh>;
}

export function Drift({ motion, at, speed, update, children }: {
  motion: boolean; at: Point; speed: number; update: (group: Group, wave: number) => void; children: ReactNode;
}) {
  const group = useRef<Group>(null);
  const phase = useRef(0);
  useFrame((_, dt) => {
    if (motion) phase.current += Math.min(dt, .05) * speed;
    if (group.current) update(group.current, Math.sin(phase.current));
  });
  return <group ref={group} position={at}>{children}</group>;
}
