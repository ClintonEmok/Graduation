'use client';

import { useUIStore } from '../../store/ui';
import { RefreshCcw, Map as MapIcon, Box } from 'lucide-react';

export function Overlay() {
  const { mode, toggleMode, triggerReset } = useUIStore();

  return (
    <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
      <button
        onClick={toggleMode}
        className="flex items-center gap-2 px-4 py-2 bg-black/80 text-cyan-400 border border-cyan-500 rounded hover:bg-black/90 transition-colors backdrop-blur-sm cursor-pointer"
      >
        {mode === 'abstract' ? <MapIcon size={16} /> : <Box size={16} />}
        <span>{mode === 'abstract' ? 'Show Map' : 'Show Abstract'}</span>
      </button>

      <button
        onClick={triggerReset}
        className="flex items-center gap-2 px-4 py-2 bg-black/80 text-pink-400 border border-pink-500 rounded hover:bg-black/90 transition-colors backdrop-blur-sm cursor-pointer"
      >
        <RefreshCcw size={16} />
        <span>Reset View</span>
      </button>
      
      <div className="mt-4 p-4 bg-black/80 border border-gray-700 rounded text-white text-xs max-w-xs backdrop-blur-sm pointer-events-none">
        <p className="font-bold mb-1">Controls:</p>
        <ul className="list-disc pl-4 space-y-1 text-gray-300">
          <li>Left Click + Drag to Rotate</li>
          <li>Right Click + Drag to Pan</li>
          <li>Scroll to Zoom</li>
        </ul>
      </div>
    </div>
  );
}
