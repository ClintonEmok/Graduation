import { MainScene } from '@/components/viz/MainScene';
import { Overlay } from '@/components/ui/Overlay';

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-black text-white relative">
      <MainScene />
      <Overlay />
    </main>
  );
}
