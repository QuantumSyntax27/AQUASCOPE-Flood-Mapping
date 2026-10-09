import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const EARTH_TEX =
  'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg';

/** Procedural fallback texture if the remote asset cannot be loaded. */
function makeFallbackEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // oceans
  const ocean = ctx.createLinearGradient(0, 0, 0, 512);
  ocean.addColorStop(0, '#0B2E59');
  ocean.addColorStop(0.5, '#0E4A8A');
  ocean.addColorStop(1, '#0B2E59');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, 1024, 512);

  // continents (deterministic blobs)
  let s = 7;
  const rng = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let c = 0; c < 14; c++) {
    const cx = rng() * 1024;
    const cy = 90 + rng() * 330;
    const land = rng() > 0.45;
    ctx.fillStyle = land ? '#3E6B3A' : '#6B5A3E';
    for (let b = 0; b < 26; b++) {
      const bx = cx + (rng() - 0.5) * 190;
      const by = cy + (rng() - 0.5) * 110;
      const r = 8 + rng() * 34;
      ctx.globalAlpha = 0.5 + rng() * 0.5;
      ctx.beginPath();
      ctx.ellipse(bx, by, r, r * (0.5 + rng() * 0.7), rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // polar caps
  ctx.fillStyle = 'rgba(225, 238, 250, 0.9)';
  ctx.fillRect(0, 0, 1024, 26);
  ctx.fillRect(0, 486, 1024, 26);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Soft procedural cloud layer. */
function makeCloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 1024, 512);
  let s = 99;
  const rng = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < 260; i++) {
    const x = rng() * 1024;
    const y = 40 + rng() * 432;
    const w = 40 + rng() * 130;
    const h = 6 + rng() * 16;
    const g = ctx.createRadialGradient(x, y, 0, x, y, w / 2);
    g.addColorStop(0, `rgba(255,255,255,${0.10 + rng() * 0.16})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, h / (w / 2));
    ctx.translate(-x, -y);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Fresnel atmosphere glow (backside additive shell). */
function Atmosphere({ radius }: { radius: number }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.2);
            gl_FragColor = vec4(0.35, 0.62, 1.0, 1.0) * intensity * 1.15;
          }
        `,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  return (
    <mesh>
      <sphereGeometry args={[radius, 64, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

interface EarthProps {
  /** rotation speed multiplier */
  speed?: number;
}

export function Earth({ speed = 1 }: EarthProps) {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  const fallback = useMemo(makeFallbackEarthTexture, []);
  const clouds = useMemo(makeCloudTexture, []);

  useEffect(() => {
    let alive = true;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      EARTH_TEX,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        if (alive) setTexture(tex);
      },
      undefined,
      () => {
        if (alive) setTexture(fallback);
      },
    );
    return () => {
      alive = false;
    };
  }, [fallback]);

  useFrame((_, delta) => {
    // Slow, realistic axial rotation — independent of the
    // orbital movement, which is handled by the parent group.
    if (earthRef.current) earthRef.current.rotation.y += delta * 0.06 * speed;
    // clouds drift slightly faster (differential rotation)
    if (cloudRef.current) cloudRef.current.rotation.y += delta * 0.085 * speed;
  });

  return (
    <group>
      {/* planet */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[1.6, 96, 96]} />
        <meshStandardMaterial
          map={texture ?? fallback}
          roughness={0.92}
          metalness={0.02}
        />
      </mesh>
      {/* clouds */}
      <mesh ref={cloudRef} scale={1.012}>
        <sphereGeometry args={[1.6, 64, 64]} />
        <meshStandardMaterial
          map={clouds}
          transparent
          opacity={0.55}
          depthWrite={false}
          roughness={1}
        />
      </mesh>
      {/* atmosphere */}
      <Atmosphere radius={1.78} />
    </group>
  );
}
