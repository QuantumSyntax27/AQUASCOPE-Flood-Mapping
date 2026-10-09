import { useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * Frame-rate independent exponential smoothing toward a
 * target value. Components receive a discrete target prop
 * and ease toward it inside the render loop — this keeps
 * every transition in the scene soft and cinematic without
 * extra React re-renders.
 */
export function useSmoothValue(
  target: number,
  speed = 3,
): MutableRefObject<number> {
  const ref = useRef(target);
  useFrame((_, delta) => {
    ref.current += (target - ref.current) * (1 - Math.exp(-delta * speed));
  });
  return ref;
}
