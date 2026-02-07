import { Timeline } from './Timeline';
import { AdaptiveControls } from './AdaptiveControls';

export function TimelineContainer({ className }: { className?: string }) {
  // Default fixed styles
  const defaultStyles = "w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 fixed bottom-0 left-0 right-0 z-40";
  
  return (
    <div className={className ? className : defaultStyles}>
      {/* Mobile Overlay */}
      <div className="md:hidden p-4 text-center text-muted-foreground flex items-center justify-center h-24">
        <p>Please use a desktop device to interact with the timeline.</p>
      </div>
      
      {/* Desktop Content */}
      <div className="hidden md:block w-full h-full p-4 relative group">
         <div className="absolute top-3 left-3 z-10 w-[220px] rounded-md border bg-background/90 backdrop-blur p-3 shadow-sm">
           <AdaptiveControls />
         </div>
         <Timeline /> 
      </div>
    </div>
  )
}
