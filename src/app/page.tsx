import { MainScene } from '@/components/viz/MainScene';
import { Overlay } from '@/components/ui/Overlay';
import { TimeControls } from '@/components/ui/TimeControls';

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-black text-white relative">
      <MainScene />
      <Overlay />
      <TimeControls />
    </main>
  );
}
