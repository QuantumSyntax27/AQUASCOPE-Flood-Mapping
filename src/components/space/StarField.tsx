import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * Deep-space star field: two layers of points on a large
 * sphere shell with subtle independent rotation and twinkle.
 */
export function StarField({ count = 2600, radius = 90 }: { count?: number; radius?: number }) {
  const ref = useRef<THREE.Points>(null);
  const farRef = useRef<THREE.Points>(null);

  const { positions, sizes, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const col = new Float32Array(count * 3);
    const rng = (() => {
      let s = 42;
      return () => {
        s = (s * 16807) % 2147483647;
        return s / 2147483647;
      };
    })();
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      // uniform sphere distribution
      const u = rng() * 2 - 1;
      const phi = rng() * Math.PI * 2;
      const r = radius * (0.55 + rng() * 0.45);
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = r * s * Math.cos(phi);
      pos[i * 3 + 1] = r * u;
      pos[i * 3 + 2] = r * s * Math.sin(phi);
      size[i] = rng();
      // mostly white-blue, some warm
      const warm = rng();
      if (warm > 0.82) c.setHSL(0.08, 0.5, 0.75);
      else if (warm < 0.18) c.setHSL(0.6, 0.45, 0.8);
      else c.setHSL(0.58, 0.12, 0.82 + rng() * 0.18);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return { positions: pos, sizes: size, colors: col };
  }, [count, radius]);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.004;
    if (farRef.current) farRef.current.rotation.y -= delta * 0.0015;
  });

  return (
    <group>
      <points ref={ref}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
            count={count}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
            count={count}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.16}
          sizeAttenuation
          vertexColors
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </points>
      {/* far, dimmer layer for depth */}
      <points ref={farRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
            count={count}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.07}
          sizeAttenuation
          color="#9AB8D8"
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

/** Radial-gradient sprite texture (for sun glow, light halos). */
export function useGlowTexture(): THREE.Texture {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255, 244, 214, 1)');
    g.addColorStop(0.25, 'rgba(255, 214, 130, 0.55)');
    g.addColorStop(0.6, 'rgba(255, 170, 60, 0.12)');
    g.addColorStop(1, 'rgba(255, 150, 40, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}
