'use client';

import { useSliceStore } from '@/store/useSliceStore';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { SliceStats } from './SliceStats';
import { PointInspector } from './PointInspector';
import { BurstList } from './BurstList';
import { BurstDetails } from './BurstDetails';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X } from 'lucide-react';

export function ContextualSlicePanel() {
  const { activeSliceId, setActiveSlice } = useSliceStore();
  const { selectedIndex, clearSelection } = useCoordinationStore();

  const isOpen = activeSliceId !== null || selectedIndex !== null;

  if (!isOpen) return null;

  const handleClose = () => {
    setActiveSlice(null);
    clearSelection();
  };

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-background border-l shadow-xl z-50 overflow-y-auto transition-transform duration-300 ease-in-out transform translate-x-0">
      <div className="flex items-center justify-between p-4 border-b bg-muted/20">
        <h2 className="font-semibold text-lg">
          {activeSliceId ? 'Slice Analysis' : 'Point Details'}
        </h2>
        <button 
          onClick={handleClose}
          className="p-2 hover:bg-muted rounded-full transition-colors"
          title="Close Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <Tabs defaultValue={selectedIndex !== null ? 'point' : activeSliceId ? 'slice' : 'bursts'} className="w-full">
        <div className="px-4 pt-4">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="point">Point</TabsTrigger>
            <TabsTrigger value="bursts">Bursts</TabsTrigger>
            <TabsTrigger value="slice">Slice</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="point">
          {selectedIndex !== null ? (
            <PointInspector pointId={String(selectedIndex)} />
          ) : (
            <div className="px-4 py-6 text-sm text-muted-foreground">Select a point to see details.</div>
          )}
        </TabsContent>

        <TabsContent value="bursts">
          <BurstList />
          <BurstDetails />
        </TabsContent>

        <TabsContent value="slice">
          {activeSliceId ? (
            <SliceStats sliceId={activeSliceId} />
          ) : (
            <div className="px-4 py-6 text-sm text-muted-foreground">Create a slice to see stats.</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
