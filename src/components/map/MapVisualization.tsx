import React from 'react';
import MapBase from './MapBase';

export default function MapVisualization() {
  return (
    <div className="w-full h-full relative">
      <MapBase />
      
      {/* Overlay UI can go here */}
      <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm p-2 rounded-md border shadow-sm z-10">
        <h2 className="text-sm font-semibold">Map View</h2>
      </div>
    </div>
  );
}
