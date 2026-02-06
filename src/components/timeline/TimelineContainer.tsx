import { Timeline } from './Timeline';
import { AdaptiveControls } from './AdaptiveControls';
import { cn } from '@/lib/utils'; // Assuming this exists, typical in shadcn/ui. If not, I'll use template literals.

export function TimelineContainer({ className }: { className?: string }) {
  // Default fixed styles
  const defaultStyles = "w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 fixed bottom-0 left-0 right-0 z-40";
  
  // If className provides positioning, it might conflict. But let's assume usage knows what it's doing.
  // Actually, if we use it in TimeControls, we want to remove 'fixed bottom-0 ...' 
  // cn() usually appends, doesn't remove unless using tailwind-merge (which cn does).
  
  return (
    <div className={className ? className : defaultStyles}>
      {/* Mobile Overlay */}
      <div className="md:hidden p-4 text-center text-muted-foreground flex items-center justify-center h-24">
        <p>Please use a desktop device to interact with the timeline.</p>
      </div>
      
      {/* Desktop Content */}
      <div className="hidden md:block w-full h-full p-4 relative group">
         {/* Adaptive Controls - Hover to see fully or always visible? Always visible for now. */}
         {/* Positioned top-left, floating above the timeline content */}
         <div className="absolute top-2 left-4 z-[100]">
            <AdaptiveControls />
         </div>
         
         <Timeline /> 
      </div>
    </div>
  )
}
