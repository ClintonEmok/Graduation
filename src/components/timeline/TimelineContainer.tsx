import { Timeline } from './Timeline';

export function TimelineContainer() {
  return (
    <div className="w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 fixed bottom-0 left-0 right-0 z-40">
      {/* Mobile Overlay */}
      <div className="md:hidden p-4 text-center text-muted-foreground flex items-center justify-center h-24">
        <p>Please use a desktop device to interact with the timeline.</p>
      </div>
      
      {/* Desktop Content */}
      <div className="hidden md:block w-full h-48 p-4">
         <Timeline /> 
      </div>
    </div>
  )
}
