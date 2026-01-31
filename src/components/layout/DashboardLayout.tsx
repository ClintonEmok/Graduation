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
  const { outerLayout, innerLayout, setOuterLayout, setInnerLayout } = useLayoutStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null; // Avoid hydration mismatch and ensure store is ready
  }

  return (
    <div className={`h-screen w-full bg-background text-foreground overflow-hidden ${className}`}>
      {/* Outer Group: Vertical Split (Top vs Bottom) */}
      <Group orientation="vertical" onLayoutChange={setOuterLayout} id="outer-group">
        
        {/* Top Area: Map (Left) and Cube (Right) */}
        <Panel id="top" defaultSize={outerLayout.top} minSize={30}>
          <Group orientation="horizontal" onLayoutChange={setInnerLayout} id="inner-group">
            {/* Left Panel: Map */}
            <Panel id="top-left" defaultSize={innerLayout.left} minSize={20}>
              <div className="h-full w-full relative overflow-hidden">
                {leftPanel}
              </div>
            </Panel>

            <Separator className="w-1 bg-border hover:bg-primary/50 transition-colors flex items-center justify-center z-50 focus:outline-none cursor-col-resize" />

            {/* Right Panel: Cube */}
            <Panel id="top-right" defaultSize={innerLayout.right} minSize={20}>
              <div className="h-full w-full relative overflow-hidden">
                {topRightPanel}
              </div>
            </Panel>
          </Group>
        </Panel>
        
        <Separator className="h-1 bg-border hover:bg-primary/50 transition-colors flex items-center justify-center z-50 focus:outline-none cursor-row-resize" />
        
        {/* Bottom Panel: Timeline */}
        <Panel id="bottom" defaultSize={outerLayout.bottom} minSize={10}>
          <div className="h-full w-full relative overflow-hidden">
            {bottomRightPanel}
          </div>
        </Panel>
      </Group>
    </div>
  );
}
