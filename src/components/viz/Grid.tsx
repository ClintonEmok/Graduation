'use client';

export function Grid() {
  return (
    <group position={[0, 0, 0]}>
      <gridHelper args={[200, 20, 'cyan', 'gray']} />
      <axesHelper args={[10]} />
    </group>
  );
}
