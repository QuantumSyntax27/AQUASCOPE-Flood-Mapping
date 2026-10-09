import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  EARTH_ORBIT_PERIOD,
  EARTH_ORBIT_RADIUS,
  SUN_POSITION,
  satelliteAngleAt,
  satelliteLocalAt,
} from './orbit';
import { useSmoothValue } from './hooks';

/**
 * Observation layers — subtle, data-driven visuals
 * that appear once the satellite begins observing:
 *
 *  · EarthTrackHighlight — a bright arc trailing Earth
 *    along its orbit, making the orbital motion readable
 *  · LatLongGrid — a faint graticule over the planet
 *    (the "data" feel of an Earth-observation product)
 *  · FloodSwath — simulated flood extent revealed along
 *    the satellite's ground track
 *
 * All opacities ease toward a discrete target so every
 * reveal is soft rather than a pop.
 */

const EARTH_RADIUS = 1.6;

/** Arc trailing Earth along its orbit. */
export function EarthTrackHighlight({
  targetOpacity = 0,
}: {
  targetOpacity?: number;
}) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 44; i++) pts.push(new THREE.Vector3());
    return pts;
  }, []);
  const geometry = useMemo(
    () => new THREE.BufferGeometry().setFromPoints(points),
    [points],
  );
  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: '#7DD3FC',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  const line = useMemo(
    () => new THREE.Line(geometry, material),
    [geometry, material],
  );
  const smooth = useSmoothValue(targetOpacity, 3);

  useFrame((state) => {
    const a =
      (state.clock.elapsedTime / EARTH_ORBIT_PERIOD) * Math.PI * 2;
    const trail = 0.62; // radians of arc behind Earth
    for (let i = 0; i <= 44; i++) {
      const ang = a - trail + (i / 44) * trail;
      points[i].set(
        SUN_POSITION[0] + Math.cos(ang) * EARTH_ORBIT_RADIUS,
        SUN_POSITION[1],
        SUN_POSITION[2] + Math.sin(ang) * EARTH_ORBIT_RADIUS,
      );
    }
    geometry.attributes.position.needsUpdate = true;
    material.opacity = smooth.current;
  });

  return <primitive object={line} />;
}

/** Faint lat/long graticule over the planet. */
export function LatLongGrid({
  targetOpacity = 0,
}: {
  targetOpacity?: number;
}) {
  const positions = useMemo(() => {
    const segs: number[] = [];
    const R = EARTH_RADIUS + 0.03;
    const SEG = 72;
    const push = (a: THREE.Vector3, b: THREE.Vector3) => {
      segs.push(a.x, a.y, a.z, b.x, b.y, b.z);
    };
    const v = (x: number, y: number, z: number) =>
      new THREE.Vector3(x, y, z);

    // meridians
    for (let m = 0; m < 6; m++) {
      const phi = (m / 6) * Math.PI;
      for (let i = 0; i < SEG; i++) {
        const t0 = (i / SEG) * Math.PI * 2;
        const t1 = ((i + 1) / SEG) * Math.PI * 2;
        push(
          v(
            R * Math.sin(t0) * Math.cos(phi),
            R * Math.cos(t0),
            R * Math.sin(t0) * Math.sin(phi),
          ),
          v(
            R * Math.sin(t1) * Math.cos(phi),
            R * Math.cos(t1),
            R * Math.sin(t1) * Math.sin(phi),
          ),
        );
      }
    }
    // parallels
    for (let p = 1; p <= 4; p++) {
      const lat = -Math.PI / 2 + (p / 5) * Math.PI;
      const r = R * Math.cos(lat);
      const y = R * Math.sin(lat);
      for (let i = 0; i < SEG; i++) {
        const t0 = (i / SEG) * Math.PI * 2;
        const t1 = ((i + 1) / SEG) * Math.PI * 2;
        push(
          v(r * Math.cos(t0), y, r * Math.sin(t0)),
          v(r * Math.cos(t1), y, r * Math.sin(t1)),
        );
      }
    }
    return new Float32Array(segs);
  }, []);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: '#7DD3FC',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  const smooth = useSmoothValue(targetOpacity, 3);

  useFrame(() => {
    material.opacity = smooth.current;
  });

  return <lineSegments args={[geometry, material]} />;
}

/**
 * Simulated flood extent revealed along the
 * satellite's ground track — the "intelligence"
 * payoff of the observation sequence.
 */
export function FloodSwath({
  targetOpacity = 0,
}: {
  targetOpacity?: number;
}) {
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#22D3EE',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  const blobs = useRef<(THREE.Mesh | null)[]>([]);
  const smooth = useSmoothValue(targetOpacity, 3);

  // angular offsets behind the satellite along its track
  const offsets = useMemo(() => [0, -0.1, -0.21], []);
  // flattened ellipsoid sizes per blob (radial axis is z)
  const scales = useMemo(
    () => [
      [0.55, 0.36, 0.05],
      [0.42, 0.3, 0.045],
      [0.33, 0.24, 0.04],
    ],
    [],
  );

  const zAxis = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  const dir = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const base = satelliteAngleAt(t);
    offsets.forEach((off, i) => {
      const blob = blobs.current[i];
      if (!blob) return;
      const [sx, sy, sz] = satelliteLocalAt(base + off);
      dir.set(sx, sy, sz).normalize();
      blob.position.copy(dir).multiplyScalar(EARTH_RADIUS + 0.035);
      // flat side faces the planet (local z aligned radially)
      blob.quaternion.setFromUnitVectors(zAxis, dir);
    });
    material.opacity = smooth.current;
  });

  return (
    <group>
      {offsets.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            blobs.current[i] = el;
          }}
          material={material}
          scale={[scales[i][0], scales[i][1], scales[i][2]]}
        >
          <sphereGeometry args={[1, 24, 16]} />
        </mesh>
      ))}
    </group>
  );
}
