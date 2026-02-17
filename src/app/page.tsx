import { Suspense } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import MapVisualization from '@/components/map/MapVisualization';
import CubeVisualization from '@/components/viz/CubeVisualization';
import { TimelinePanel } from '@/components/timeline/TimelinePanel';
import { StudyControls } from '@/components/study/StudyControls';
import { ContextualSlicePanel } from '@/components/viz/ContextualSlicePanel';
import { TopBar } from '@/components/layout/TopBar';

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-black text-white relative flex flex-col">
      <Suspense fallback={null}>
        <TopBar />
      </Suspense>
      <div className="flex-1">
        <DashboardLayout
          leftPanel={<MapVisualization />}
          topRightPanel={<CubeVisualization />}
          bottomRightPanel={<TimelinePanel />}
        />
      </div>
      <StudyControls />
      <ContextualSlicePanel />
    </main>
  );
}
