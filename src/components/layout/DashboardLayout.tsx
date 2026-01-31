"use client";

import { ReactNode, useEffect, useState } from "react";
import { Panel, Group, Separator } from "react-resizable-panels";
import { useLayoutStore } from "@/store/useLayoutStore";

interface DashboardLayoutProps {
  leftPanel: ReactNode;
  topRightPanel: ReactNode;
  bottomRightPanel: ReactNode;
  className?: string;
}

export default function DashboardLayout({
  leftPanel,
  topRightPanel,
  bottomRightPanel,
  className = "",
}: DashboardLayoutProps) {
  const { mainLayout, rightLayout, setMainLayout, setRightLayout } = useLayoutStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null; // Avoid hydration mismatch and ensure store is ready
  }

  return (
    <div className={`h-screen w-full bg-background text-foreground overflow-hidden ${className}`}>
      <Group orientation="horizontal" onLayoutChange={setMainLayout} id="main-group">
        {/* Left Panel: Map */}
        <Panel id="left" defaultSize={mainLayout.left} minSize={20}>
          <div className="h-full w-full relative overflow-hidden">
            {leftPanel}
          </div>
        </Panel>
        
        <Separator className="w-1 bg-border hover:bg-primary/50 transition-colors flex items-center justify-center z-50 focus:outline-none cursor-col-resize" />
        
        {/* Right Panel Group */}
        <Panel id="right" defaultSize={mainLayout.right} minSize={30}>
          <Group orientation="vertical" onLayoutChange={setRightLayout} id="right-group">
            {/* Top Right: Cube */}
            <Panel id="top" defaultSize={rightLayout.top} minSize={30}>
              <div className="h-full w-full relative overflow-hidden">
                {topRightPanel}
              </div>
            </Panel>
            
            <Separator className="h-1 bg-border hover:bg-primary/50 transition-colors flex items-center justify-center z-50 focus:outline-none cursor-row-resize" />
            
            {/* Bottom Right: Timeline */}
            <Panel id="bottom" defaultSize={rightLayout.bottom} minSize={10}>
              <div className="h-full w-full relative overflow-hidden">
                {bottomRightPanel}
              </div>
            </Panel>
          </Group>
        </Panel>
      </Group>
    </div>
  );
}
