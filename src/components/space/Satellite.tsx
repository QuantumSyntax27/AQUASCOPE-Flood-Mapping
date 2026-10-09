import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useSmoothValue } from './hooks';
import {
  satelliteAngleAt,
  satelliteLocalAt,
  satelliteLocalPosition,
} from './orbit';

/**
 * Earth-observation satellite: central body, twin solar
 * wings, sensor dish, and subtle blinking beacon lights.
 * Travels a physical inclined orbit around Earth,
 * nadir-pointing (sensor faces the planet) like a
 * real Earth-observation spacecraft.
 */

export function Satellite({
  visible = true,
  scanning = false,
  intro = 1,
}: {
  visible?: boolean;
  scanning?: boolean;
  intro?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const beaconRed = useRef<THREE.Mesh>(null);
  const beaconGreen = useRef<THREE.Mesh>(null);
  const dish = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const footprintRef = useRef<THREE.Mesh>(null);

  const introSmooth = useSmoothValue(intro, 2.4);

  const panelMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#123A6B',
        metalness: 0.75,
        roughness: 0.35,
        transparent: true,
        opacity: 0,
      }),
    [],
  );
  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#C9D4E0',
        metalness: 0.6,
        roughness: 0.35,
        transparent: true,
        opacity: 0,
      }),
    [],
  );
  const darkMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2A3442',
        metalness: 0.5,
        roughness: 0.5,
        transparent: true,
        opacity: 0,
      }),
    [],
  );
  const beamMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#38BDF8',
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const footprintMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#38BDF8',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const intro = introSmooth.current;

    // orbit position
    const [x, y, z] = satelliteLocalPosition(t);
    group.current.position.set(x, y, z);

    // gentle scale-in when the satellite is introduced
    group.current.scale.setScalar(0.55 + 0.45 * intro);

    // orientation: nadir-pointing — the sensor section
    // faces Earth for the whole orbit, like a real
    // Earth-observation satellite
    group.current.lookAt(0, 0, 0);
    group.current.rotateZ(Math.sin(t * 0.2) * 0.04);

    // body fades in
    panelMaterial.opacity = intro;
    bodyMaterial.opacity = intro;
    darkMaterial.opacity = intro;

    // beacons blink alternately
    const blink = (phase: number) =>
      (Math.sin(t * 2.0 + phase) > 0.6 ? 1 : 0.08) * intro;
    if (beaconRed.current) {
      (beaconRed.current.material as THREE.MeshBasicMaterial).opacity =
        blink(0);
    }
    if (beaconGreen.current) {
      (beaconGreen.current.material as THREE.MeshBasicMaterial).opacity =
        blink(Math.PI);
    }

    // sensor dish points steadily at Earth (+z after lookAt)
    if (dish.current) {
      dish.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.5) * 0.05;
    }

    // scan beam: active while scanning, with a very
    // gentle "live sensor" breathing
    const breathe = 0.9 + 0.1 * Math.sin(t * 1.1);
    const beamTarget = scanning ? 0.17 * breathe * intro : 0;
    const footprintTarget = scanning ? 0.42 * intro : 0;
    const beam = beamRef.current?.material as
      | THREE.MeshBasicMaterial
      | undefined;
    const fp = footprintRef.current?.material as
      | THREE.MeshBasicMaterial
      | undefined;
    if (beam) beam.opacity += (beamTarget - beam.opacity) * 0.06;
    if (fp) {
      fp.opacity += (footprintTarget - fp.opacity) * 0.06;
      if (footprintRef.current) {
        const s = 1 + Math.sin(t * 1.1) * 0.045;
        footprintRef.current.scale.set(s, s, 1);
      }
    }
  });

  if (!visible) return null;

  return (
    <group ref={group}>
      {/* central body */}
      <mesh material={bodyMaterial}>
        <boxGeometry args={[0.22, 0.22, 0.3]} />
      </mesh>
      {/* sensor housing */}
      <mesh position={[0, 0, 0.17]} material={darkMaterial}>
        <boxGeometry args={[0.16, 0.14, 0.1]} />
      </mesh>
      {/* sensor dish pointing at Earth */}
      <mesh ref={dish} position={[0, 0, 0.28]} material={darkMaterial}>
        <coneGeometry args={[0.09, 0.1, 24, 1, true]} />
      </mesh>
      {/* solar wings */}
      <mesh position={[-0.42, 0, 0]} material={panelMaterial}>
        <boxGeometry args={[0.5, 0.015, 0.26]} />
      </mesh>
      <mesh position={[0.42, 0, 0]} material={panelMaterial}>
        <boxGeometry args={[0.5, 0.015, 0.26]} />
      </mesh>
      {/* wing booms */}
      <mesh position={[-0.18, 0, 0]} material={darkMaterial}>
        <cylinderGeometry args={[0.012, 0.012, 0.14]} />
      </mesh>
      <mesh position={[0.18, 0, 0]} material={darkMaterial}>
        <cylinderGeometry args={[0.012, 0.012, 0.14]} />
      </mesh>
      {/* beacon lights */}
      <mesh ref={beaconRed} position={[0, 0.13, 0.1]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshBasicMaterial color="#FF5A5A" transparent opacity={0.1} />
      </mesh>
      <mesh ref={beaconGreen} position={[0, 0.13, -0.1]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshBasicMaterial color="#4ADE80" transparent opacity={0.1} />
      </mesh>
      {/* scan beam: cone from sensor toward Earth's surface */}
      <mesh
        ref={beamRef}
        position={[0, 0, 0.92]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={beamMaterial}
      >
        <coneGeometry args={[0.5, 1.15, 32, 1, true]} />
      </mesh>
      {/* ground footprint ring on Earth's surface */}
      <mesh
        ref={footprintRef}
        position={[0, 0, 1.46]}
        material={footprintMaterial}
      >
        <ringGeometry args={[0.3, 0.42, 48]} />
      </mesh>
    </group>
  );
}

/** Orbit path of the satellite (visualized). */
export function SatelliteOrbitPath({ opacity = 0.35 }: { opacity?: number }) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 160; i++) {
      const a = (i / 160) * Math.PI * 2;
      const [x, y, z] = satelliteLocalAt(a);
      pts.push(new THREE.Vector3(x, y, z));
    }
    return pts;
  }, []);  const geometry = useMemo(
    () => new THREE.BufferGeometry().setFromPoints(points),
    [points],
  );

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: '#38BDF8',
        transparent: true,
        opacity,
      }),
    [opacity],
  );

  const line = useMemo(
    () => new THREE.Line(geometry, material),
    [geometry, material],
  );

  return <primitive object={line} />;
}
