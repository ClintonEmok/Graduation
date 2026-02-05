'use client';

import { useSliceStore, TimeSlice } from '@/store/useSliceStore';
import { useDataStore } from '@/store/useDataStore';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Eye, EyeOff, Lock, Unlock, Trash2, Plus, RefreshCw, Calendar as CalendarIcon, Layers } from 'lucide-react';
import { normalizedToEpochSeconds, epochSecondsToNormalized } from '@/lib/time-domain';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SliceManagerUIProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SliceManagerUI({ isOpen, onClose }: SliceManagerUIProps) {
  const { slices, addSlice, removeSlice, updateSlice, toggleLock, toggleVisibility, clearSlices } = useSliceStore();
  const { minTimestampSec, maxTimestampSec } = useDataStore();

  const handleAddPointSlice = () => {
    addSlice({ type: 'point', time: 50 });
  };

  const handleAddRangeSlice = () => {
    addSlice({ type: 'range', range: [40, 60] });
  };

  const handleGenerate = () => {
    // Generate 3 evenly spaced point slices
    clearSlices();
    addSlice({ type: 'point', time: 25 });
    addSlice({ type: 'point', time: 50 });
    addSlice({ type: 'point', time: 75 });
  };
  
  const formatTime = (normalized: number) => {
    if (minTimestampSec === null || maxTimestampSec === null) return `${normalized.toFixed(1)}%`;
    const seconds = normalizedToEpochSeconds(normalized, minTimestampSec, maxTimestampSec);
    return format(new Date(seconds * 1000), "PPP");
  };

  const formatRange = (range?: [number, number]) => {
    if (!range) return "Invalid range";
    if (minTimestampSec === null || maxTimestampSec === null) 
      return `${range[0].toFixed(1)}% - ${range[1].toFixed(1)}%`;
    
    const start = normalizedToEpochSeconds(range[0], minTimestampSec, maxTimestampSec);
    const end = normalizedToEpochSeconds(range[1], minTimestampSec, maxTimestampSec);
    return `${format(new Date(start * 1000), "MMM d, yyyy")} - ${format(new Date(end * 1000), "MMM d, yyyy")}`;
  };

  const getDateFromNormalized = (normalized: number) => {
    const seconds = normalizedToEpochSeconds(normalized, minTimestampSec || 0, maxTimestampSec || 86400 * 365);
    return new Date(seconds * 1000);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Time Slices</SheetTitle>
          <SheetDescription>
            Manage temporal cross-sections and ranges.
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-6 space-y-4">
            <div className="flex gap-2">
                <Button onClick={handleAddPointSlice} className="flex-1" size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Point
                </Button>
                <Button onClick={handleAddRangeSlice} className="flex-1" size="sm">
                    <Layers className="mr-2 h-4 w-4" /> Range
                </Button>
                <Button variant="outline" onClick={handleGenerate} title="Generate 25/50/75%" size="sm">
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            <div className="space-y-2">
                {slices.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-md">
                        No slices active. Add one to probe the data.
                    </p>
                )}
                {slices.map((slice) => (
                    <div key={slice.id} className="flex flex-col gap-2 border p-3 rounded-md bg-accent/5">
                        <div className="flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground px-1.5 py-0.5 bg-accent rounded">
                                    {slice.type}
                                </span>
                                {slice.type === 'point' ? (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="h-8 text-xs flex-1 justify-start">
                                                <CalendarIcon className="mr-2 h-3.3 w-3.5" />
                                                {formatTime(slice.time)}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={getDateFromNormalized(slice.time)}
                                                onSelect={(date) => {
                                                    if (date && minTimestampSec !== null && maxTimestampSec !== null) {
                                                        const normalized = epochSecondsToNormalized(date.getTime() / 1000, minTimestampSec, maxTimestampSec);
                                                        updateSlice(slice.id, { time: normalized });
                                                    }
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                ) : (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="h-8 text-xs flex-1 justify-start overflow-hidden text-ellipsis whitespace-nowrap">
                                                <CalendarIcon className="mr-2 h-3.3 w-3.5 shrink-0" />
                                                {formatRange(slice.range)}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="range"
                                                selected={{
                                                    from: getDateFromNormalized(slice.range?.[0] || 0),
                                                    to: getDateFromNormalized(slice.range?.[1] || 100)
                                                }}
                                                onSelect={(range) => {
                                                    if (range?.from && range?.to && minTimestampSec !== null && maxTimestampSec !== null) {
                                                        const start = epochSecondsToNormalized(range.from.getTime() / 1000, minTimestampSec, maxTimestampSec);
                                                        const end = epochSecondsToNormalized(range.to.getTime() / 1000, minTimestampSec, maxTimestampSec);
                                                        updateSlice(slice.id, { range: [start, end] });
                                                    }
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-1">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => toggleVisibility(slice.id)}
                                >
                                    {slice.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                                </Button>
                                
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
                        </div>
                    </div>
                ))}
            </div>
            
            {slices.length > 0 && (
                <Button variant="outline" onClick={clearSlices} className="w-full text-destructive hover:text-destructive text-xs h-8">
                    Clear All
                </Button>
            )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
