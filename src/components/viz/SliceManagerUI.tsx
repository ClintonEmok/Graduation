'use client';

import { useSliceStore } from '@/store/useSliceStore';
import { useDataStore } from '@/store/useDataStore';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Lock, Unlock, Trash2, Plus, RefreshCw } from 'lucide-react';
import { normalizedToEpochSeconds } from '@/lib/time-domain';

interface SliceManagerUIProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SliceManagerUI({ isOpen, onClose }: SliceManagerUIProps) {
  const { slices, addSlice, removeSlice, updateSlice, toggleLock, toggleVisibility, clearSlices } = useSliceStore();
  const { minTimestampSec, maxTimestampSec } = useDataStore();

  const handleAddSlice = () => {
    addSlice(50); // Default middle
  };

  const handleGenerate = () => {
    // Generate 3 evenly spaced slices
    clearSlices();
    addSlice(25);
    addSlice(50);
    addSlice(75);
  };
  
  const formatTime = (normalized: number) => {
    if (minTimestampSec === null || maxTimestampSec === null) return `${normalized.toFixed(1)}%`;
    const seconds = normalizedToEpochSeconds(normalized, minTimestampSec, maxTimestampSec);
    return new Date(seconds * 1000).toLocaleDateString();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px]">
        <SheetHeader>
          <SheetTitle>Time Slices</SheetTitle>
          <SheetDescription>
            Manage temporal cross-sections.
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-6 space-y-4">
            <div className="flex gap-2">
                <Button onClick={handleAddSlice} className="flex-1">
                    <Plus className="mr-2 h-4 w-4" /> Add Slice
                </Button>
                <Button variant="outline" onClick={handleGenerate} title="Generate 25/50/75%">
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            <div className="space-y-2">
                {slices.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No slices active. Add one to probe the data.
                    </p>
                )}
                {slices.map((slice) => (
                    <div key={slice.id} className="flex items-center gap-2 border p-2 rounded-md">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => toggleVisibility(slice.id)}
                        >
                            {slice.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                        
                        <div className="flex-1">
                            <div className="text-xs text-muted-foreground mb-1">
                                {formatTime(slice.time)}
                            </div>
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="number" 
                                    min={0} 
                                    max={100} 
                                    step={0.1}
                                    value={slice.time}
                                    onChange={(e) => updateSlice(slice.id, { time: parseFloat(e.target.value) })}
                                    className="h-6 text-xs"
                                />
                            </div>
                        </div>

                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => toggleLock(slice.id)}
                        >
                            {slice.isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                        
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => removeSlice(slice.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
            
            {slices.length > 0 && (
                <Button variant="outline" onClick={clearSlices} className="w-full text-destructive hover:text-destructive">
                    Clear All
                </Button>
            )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
