import DashboardLayout from '@/components/layout/DashboardLayout';
import MapVisualization from '@/components/map/MapVisualization';
import CubeVisualization from '@/components/viz/CubeVisualization';
import { TimelinePanel } from '@/components/timeline/TimelinePanel';

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-black text-white">
      <DashboardLayout
        leftPanel={<MapVisualization />}
        topRightPanel={<CubeVisualization />}
        bottomRightPanel={<TimelinePanel />}
      />
    </main>
  );
}
