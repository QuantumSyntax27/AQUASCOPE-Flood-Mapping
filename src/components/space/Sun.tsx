import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGlowTexture } from './StarField';
import { useSmoothValue } from './hooks';
import { SUN_POSITION } from './orbit';

/**
 * The Sun: bright core + two restrained additive glow
 * layers, plus the point light that illuminates the
 * day side of the planets. `fade` eases the whole
 * system in when the solar-system chapter begins.
 */
export function Sun({
  position = SUN_POSITION,
  fade = 1,
}: {
  position?: [number, number, number];
  fade?: number;
}) {
  const glow = useGlowTexture();
  const halo = useGlowTexture();
  const fadeSmooth = useSmoothValue(fade, 2.5);

  const coreMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#FFF6DC',
        transparent: true,
        opacity: 0,
      }),
    [],
  );
  const glowMaterial = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: glow,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0,
      }),
    [glow],
  );
  const haloMaterial = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: halo,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0,
      }),
    [halo],
  );
  const light = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    // gentle, natural light variation (±3.5%)
    const flicker =
      Math.sin(state.clock.elapsedTime * 0.6) * 0.035 + 0.985;
    const f = fadeSmooth.current * flicker;
    coreMaterial.opacity = fadeSmooth.current;
    glowMaterial.opacity = 0.72 * f;
    haloMaterial.opacity = 0.2 * f;
    if (light.current) light.current.intensity = 2.3 * fadeSmooth.current;
  });

  return (
    <group position={position}>
      {/* light */}
      <pointLight
        ref={light}
        color="#FFE9C4"
        intensity={0}
        distance={0}
        decay={0}
      />
      {/* core */}
      <mesh material={coreMaterial}>
        <sphereGeometry args={[1.5, 32, 32]} />
      </mesh>
      {/* glow layers (restrained so the core stays distinct) */}
      <sprite material={glowMaterial} scale={[7.2, 7.2, 1]} />
      <sprite material={haloMaterial} scale={[13.5, 13.5, 1]} />
    </group>
  );
}

/** Thin, elegant orbital paths. */
export function OrbitRing({
  radius,
  tilt = 0,
  opacity = 0.22,
  fade = 1,
}: {
  radius: number;
  tilt?: number;
  opacity?: number;
  fade?: number;
}) {
  const fadeSmooth = useSmoothValue(fade, 2.5);

  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return pts;
  }, [radius]);

  const geometry = useMemo(
    () => new THREE.BufferGeometry().setFromPoints(points),
    [points],
  );

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: '#4E7FB8',
        transparent: true,
        opacity: 0,
      }),
    [],
  );

  const line = useMemo(
    () => new THREE.Line(geometry, material),
    [geometry, material],
  );

  useFrame(() => {
    material.opacity = opacity * fadeSmooth.current;
  });

  return <primitive object={line} rotation={[tilt, 0, 0]} />;
}

/** Subtle contextual planets (not to scale — visual storytelling only). */
export function Planet({
  orbitRadius,
  size,
  color,
  speed = 0.02,
  startAngle = 0,
  tilt = 0,
  fade = 1,
}: {
  orbitRadius: number;
  size: number;
  color: string;
  speed?: number;
  startAngle?: number;
  tilt?: number;
  fade?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const fadeSmooth = useSmoothValue(fade, 2.5);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.85,
        transparent: true,
        opacity: 0,
      }),
    [color],
  );

  useFrame((state) => {
    if (!ref.current) return;
    const a = startAngle + state.clock.elapsedTime * speed;
    ref.current.position.set(
      Math.cos(a) * orbitRadius,
      0,
      Math.sin(a) * orbitRadius,
    );
    ref.current.rotation.y += 0.01;
    material.opacity = fadeSmooth.current;
  });

  return (
    <mesh ref={ref} rotation={[tilt, 0, 0]} material={material}>
      <sphereGeometry args={[size, 24, 24]} />
    </mesh>
  );
}
