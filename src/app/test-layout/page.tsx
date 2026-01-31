"use client";

import DashboardLayout from "@/components/DashboardLayout";

export default function TestLayoutPage() {
  return (
    <DashboardLayout
      leftPanel={
        <div className="h-full w-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Map Panel</h2>
            <p className="text-sm opacity-70">Left side (40%)</p>
          </div>
        </div>
      }
      topRightPanel={
        <div className="h-full w-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Cube Panel</h2>
            <p className="text-sm opacity-70">Top Right (70%)</p>
          </div>
        </div>
      }
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
