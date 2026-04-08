"use client";

import { CameraControls } from "@react-three/drei";
import { Scene } from "@/components/viz/Scene";
import { TimelineTest3DPoints } from "./TimelineTest3DPoints";
import { TimeSlices3D } from "./TimeSlices3D";
import { WarpSlices3D } from "./WarpSlices3D";

export function TimelineTest3DScene() {
  return (
    <section className="rounded-md border border-slate-700/70 bg-slate-950/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">3D Scene</h2>
        <span className="text-[11px] text-slate-400">Canonical store adapter</span>
      </div>
      <div className="h-[420px] w-full overflow-hidden rounded-md border border-slate-800">
        <Scene>
          <ambientLight intensity={0.45} />
          <directionalLight position={[40, 60, 30]} intensity={0.85} />
          <TimelineTest3DPoints />
          <TimeSlices3D />
          <WarpSlices3D />
          <CameraControls
            makeDefault
            smoothTime={0.22}
            minDistance={20}
            maxDistance={300}
            maxPolarAngle={Math.PI / 2}
          />
        </Scene>
      </div>
    </section>
  );
}
