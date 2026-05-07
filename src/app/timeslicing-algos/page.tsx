import { Suspense } from 'react';
import { TimeslicingAlgosRouteShell } from './lib/TimeslicingAlgosRouteShell';

export default function TimeslicingAlgosPage() {
  return (
    <Suspense fallback={null}>
      <TimeslicingAlgosRouteShell />
    </Suspense>
  );
}
