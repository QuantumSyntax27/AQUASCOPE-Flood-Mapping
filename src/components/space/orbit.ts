/**
 * Shared orbital constants for the space scene.
 *
 * The Sun is the central reference of the stylized inner
 * solar system. Earth is a planet on the innermost orbit,
 * so the scene tells a physically consistent story:
 * Sun → orbit ring → Earth → satellite around Earth.
 */

/** Sun position (visual anchor, behind the orbit system). */
export const SUN_POSITION: [number, number, number] = [0, 1.2, -7.5];

/** Earth's orbit radius around the Sun (stylized, not to scale). */
export const EARTH_ORBIT_RADIUS = 6.4;

/** Earth's orbital period in seconds — slow enough to read as orbital motion. */
export const EARTH_ORBIT_PERIOD = 80;

/** Live position of Earth on its orbit for a given scene time. */
export function earthOrbitPosition(t: number): [number, number, number] {
  const a = (t / EARTH_ORBIT_PERIOD) * Math.PI * 2;
  return [
    SUN_POSITION[0] + Math.cos(a) * EARTH_ORBIT_RADIUS,
    SUN_POSITION[1],
    SUN_POSITION[2] + Math.sin(a) * EARTH_ORBIT_RADIUS,
  ];
}

// ─── Satellite orbit (Earth-local space) ─────────────────────

export const SATELLITE_ORBIT_RADIUS = 3.1;
export const SATELLITE_ORBIT_TILT = 0.42; // radians inclination
export const SATELLITE_ORBIT_PERIOD = 34; // seconds per revolution
/**
 * Phase offset chosen so the satellite crosses the
 * camera's front view during the "scanning" chapter
 * of the intro — the beam is reliably visible then.
 */
export const SATELLITE_ORBIT_PHASE = -0.626;

/** Current orbit angle of the satellite for a scene time. */
export function satelliteAngleAt(t: number): number {
  return (t / SATELLITE_ORBIT_PERIOD) * Math.PI * 2 + SATELLITE_ORBIT_PHASE;
}

/** Satellite position in Earth-local space for a given orbit angle. */
export function satelliteLocalAt(
  angle: number,
): [number, number, number] {
  const x = Math.cos(angle) * SATELLITE_ORBIT_RADIUS;
  const z = Math.sin(angle) * SATELLITE_ORBIT_RADIUS;
  const y = Math.sin(angle) * Math.sin(SATELLITE_ORBIT_TILT) * SATELLITE_ORBIT_RADIUS;
  return [x, y, z];
}

/** Satellite position in Earth-local space for a given scene time. */
export function satelliteLocalPosition(
  t: number,
): [number, number, number] {
  return satelliteLocalAt(satelliteAngleAt(t));
}
