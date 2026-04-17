import type { Metadata } from 'next';
import { NonUniformTimeSlicingShowcase } from './showcase';

export const metadata: Metadata = {
  title: 'Non-uniform time slicing demo | Quiet Tiger',
  description: 'A route that showcases granularity-aware brushed selection partitioning with real crime timestamps.',
};

export default function NonUniformTimeSlicingPage() {
  return <NonUniformTimeSlicingShowcase />;
}
