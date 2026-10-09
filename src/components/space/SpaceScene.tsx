import { useRef } from 'react';
import type { ReactNode } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { StarField } from './StarField';
import { Earth } from './Earth';
import { Sun, OrbitRing, Planet } from './Sun';
import {
  Satellite,
  SatelliteOrbitPath,
} from './Satellite';
import {
  EarthTrackHighlight,
  FloodSwath,
  LatLongGrid,
} from './ObservationLayers';
import {
  earthOrbitPosition,
  satelliteLocalPosition,
  SUN_POSITION,
} from './orbit';
import { useSmoothValue } from './hooks';

/**
 * SpaceScene — the shared 3D environment used by the
 * cinematic intro and the scroll-driven landing page.
 *
 * Story hierarchy:
 *   Sun  = system reference
 *   Earth = main subject (orbits the Sun, rotates on its axis)
 *   Satellite = observation system (orbits Earth, nadir-pointing)
 *   Scan beam = data acquisition
 *   Flood swath + graticule = AQUASCOPE intelligence
 *
 * mode="intro":  camera is choreographed by `phase`
 * mode="scroll": camera follows Earth, offset by `scroll` (0..1)
 */

export type SpacePhase =
  | 'space'
  | 'solar'
  | 'earth'
  | 'orbit'
  | 'scan'
  | 'logo';

const PHASE_INDEX: Record<SpacePhase, number> = {
  space: 0,
  solar: 1,
  earth: 2,
  orbit: 3,
  scan: 4,
  logo: 5,
};

// Fixed camera keys (wide chapters)
const CAM_SPACE: [number, number, number] = [0, 1.4, 13.5];
const LOOK_SPACE: [number, number, number] = [0, 0, 0];
const CAM_SOLAR: [number, number, number] = [0.5, 1.55, 9.0];
const LOOK_SOLAR: [number, number, number] = [0, 0.55, -2.2];

// Earth-relative camera offsets (follow chapters)
const FOLLOW_OFFSETS: Record<string, [number, number, number]> = {
  earth: [0, 0.95, 4.7],
  orbit: [3.2, 1.9, 4.5],
  scan: [1.15, 0.7, 4.3],
  logo: [0, 0.75, 6.9],
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function lerpV(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/**
 * Cinematic camera rig. Wide chapters use fixed keys;
 * the Earth chapters follow the live planet position,
 * so Earth stays centered while everything else
 * drifts by naturally. All motion is exponentially
 * smoothed — no jumps, no fast cuts.
 */
function CameraRig({
  phase,
  scroll,
  mode,
}: {
  phase: SpacePhase;
  scroll: number;
  mode: 'intro' | 'scroll';
}) {
  const { camera } = useThree();
  const cur = useRef<[number, number, number]>(CAM_SPACE);
  const look = useRef<[number, number, number]>(LOOK_SPACE);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const earth = earthOrbitPosition(t);
    const sat = satelliteLocalPosition(t);

    let target: [number, number, number];
    let targetLook: [number, number, number];

    if (mode === 'scroll') {
      // glide from a wide system view toward a close Earth view
      const off: [number, number, number] = [
        lerp(0.9, 1.05, scroll),
        lerp(1.35, 0.7, scroll),
        lerp(12.6, 3.6, scroll),
      ];
      target = [earth[0] + off[0], earth[1] + off[1], earth[2] + off[2]];
      targetLook = [earth[0], earth[1] + lerp(0.15, 0, scroll), earth[2]];
    } else if (phase === 'space') {
      // subtle parallax drift
      target = [
        CAM_SPACE[0] + Math.sin(t * 0.05) * 0.35,
        CAM_SPACE[1] + Math.sin(t * 0.04) * 0.18,
        CAM_SPACE[2],
      ];
      targetLook = LOOK_SPACE;
    } else if (phase === 'solar') {
      target = CAM_SOLAR;
      targetLook = LOOK_SOLAR;
    } else {
      const off = FOLLOW_OFFSETS[phase];
      // gently biased toward the satellite while it orbits
      const satFollow =
        phase === 'orbit' ? 0.22 : phase === 'scan' ? 0.12 : 0;
      target = [
        earth[0] + off[0],
        earth[1] + off[1],
        earth[2] + off[2],
      ];
      targetLook = [
        earth[0] + sat[0] * satFollow,
        earth[1] + sat[1] * satFollow,
        earth[2] + sat[2] * satFollow,
      ];
    }

    // frame-rate independent smoothing
    const k = 1 - Math.exp(-delta * 2.0);
    cur.current = lerpV(cur.current, target, k);
    look.current = lerpV(look.current, targetLook, k);
    camera.position.set(cur.current[0], cur.current[1], cur.current[2]);
    camera.lookAt(look.current[0], look.current[1], look.current[2]);
  });

  return null;
}

/** Positions (and gently scales in) the Earth system on its orbit. */
function EarthSystem({
  earthScale,
  intro,
  focus,
  visible,
  children,
}: {
  earthScale: number;
  intro: number;
  focus: number;
  visible: boolean;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const introSmooth = useSmoothValue(intro, 2.0);

  useFrame((state) => {
    if (!ref.current) return;
    const [x, y, z] = earthOrbitPosition(state.clock.elapsedTime);
    ref.current.position.set(x, y, z);
    // intro scale-in, then the scroll-driven focus zoom
    const s =
      earthScale *
      (0.35 + 0.65 * introSmooth.current) *
      (1 + focus * 0.55);
    ref.current.scale.set(s, s, s);
  });

  return (
    <group ref={ref} visible={visible}>
      {children}
    </group>
  );
}

export function SpaceScene({
  mode = 'intro',
  phase = 'space',
  scroll = 0,
}: {
  mode?: 'intro' | 'scroll';
  phase?: SpacePhase;
  scroll?: number;
}) {
  const pi = PHASE_INDEX[phase];
  const isIntro = mode === 'intro';

  // ── choreography targets (eased per frame by consumers) ──
  const systemFadeTarget = isIntro ? (pi >= 1 ? 1 : 0) : 1;
  const earthIntroTarget = isIntro ? (pi >= 1 ? 1 : 0) : 1;
  const satIntroTarget = isIntro ? (pi >= 3 ? 1 : 0) : 1;

  const earthVis = isIntro ? (pi >= 1 ? 1 : 0) : 0.05;
  const sunVis = isIntro ? (pi >= 1 ? 1 : 0) : 1;
  const orbitsVis = isIntro ? (pi >= 1 ? 0.85 : 0) : 1 - scroll * 0.55;
  const satVis = isIntro ? (pi >= 3 ? 1 : 0) : scroll > 0.22 ? 1 : 0;
  const scanActive = isIntro ? pi >= 4 : scroll > 0.5 && scroll < 0.86;
  const earthScale = isIntro ? 1 : 0.55 + scroll * 0.75;
  const earthFocus = isIntro ? (pi >= 4 ? 0.3 : 0) : scroll;

  // observation layers fade in once scanning begins
  const gridTarget = isIntro
    ? pi >= 4
      ? 0.13
      : 0
    : Math.max(0, Math.min(1, (scroll - 0.5) / 0.3)) * 0.12;
  const swathTarget = isIntro
    ? pi >= 4
      ? 0.3
      : 0
    : Math.max(0, Math.min(1, (scroll - 0.55) / 0.3)) * 0.26;
  const trackTarget = isIntro
    ? pi >= 1
      ? 0.4
      : 0
    : Math.max(0, 1 - scroll * 0.7) * 0.3;

  return (
    <>
      {/* deep space */}
      <color attach="background" args={['#020409']} />
      <fog attach="fog" args={['#020409', 26, 120]} />
      <ambientLight intensity={0.1} />
      <StarField count={2400} radius={80} />
      <StarField count={900} radius={55} />

      {/* sun + inner solar system (the reference frame) */}
      <group visible={sunVis > 0.02}>
        <Sun position={SUN_POSITION} fade={systemFadeTarget} />
        <group visible={orbitsVis > 0.05}>
          {/* Earth's orbit — the most legible ring */}
          <OrbitRing radius={6.4} opacity={0.16} fade={systemFadeTarget} />
          <OrbitRing radius={8.2} tilt={0.09} opacity={0.1} fade={systemFadeTarget} />
          <OrbitRing radius={10.6} tilt={-0.07} opacity={0.08} fade={systemFadeTarget} />
          <OrbitRing radius={13.0} tilt={0.05} opacity={0.06} fade={systemFadeTarget} />
          {/* contextual planets — deliberately subtle */}
          <Planet
            orbitRadius={8.2}
            size={0.3}
            color="#A87B5F"
            speed={0.055}
            startAngle={2.4}
            fade={systemFadeTarget}
          />
          <Planet
            orbitRadius={10.6}
            size={0.46}
            color="#6E82A0"
            speed={0.032}
            startAngle={5.1}
            tilt={0.18}
            fade={systemFadeTarget}
          />
          <Planet
            orbitRadius={13.0}
            size={0.4}
            color="#4E6E96"
            speed={0.02}
            startAngle={0.7}
            tilt={-0.12}
            fade={systemFadeTarget}
          />
          {/* bright arc trailing Earth — makes the orbit readable */}
          <EarthTrackHighlight targetOpacity={trackTarget} />
        </group>
      </group>

      {/* Earth system — a real planet on its orbit around the Sun */}
      <EarthSystem
        earthScale={earthScale}
        intro={earthIntroTarget}
        focus={earthFocus}
        visible={earthVis > 0.02}
      >
        <Earth speed={1} />
        <LatLongGrid targetOpacity={gridTarget} />
        <FloodSwath targetOpacity={swathTarget} />
        {/* satellite system */}
        <group visible={satVis > 0.02}>
          <SatelliteOrbitPath opacity={isIntro ? 0.45 : 0.3} />
          <Satellite visible scanning={scanActive} intro={satIntroTarget} />
        </group>
      </EarthSystem>

      <CameraRig phase={phase} scroll={scroll} mode={mode} />
    </>
  );
}
