"use client";

import DashboardLayout from "@/components/DashboardLayout";
import CubeVisualization from "@/components/CubeVisualization";
import MapVisualization from "@/components/map/MapVisualization";

export default function TestLayoutPage() {
  return (
    <DashboardLayout
      leftPanel={<MapVisualization />}
      topRightPanel={<CubeVisualization />}
      bottomRightPanel={
        <div className="h-full w-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Timeline Panel</h2>
            <p className="text-sm opacity-70">Bottom Right (30%)</p>
          </div>
        </div>
      }
    />
  );
}
