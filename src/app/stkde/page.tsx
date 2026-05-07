import { Suspense } from 'react';
import { StkdeRouteShell } from './lib/StkdeRouteShell';

export default function StkdePage() {
  return (
    <Suspense fallback={null}>
      <StkdeRouteShell />
    </Suspense>
  );
}
