import { SketchShell } from '../_components/SketchShell';
import { MapFigureClient } from '../_components/MapFigureClient';

type FiguresMapPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function isScreenshotMode(searchParams?: Record<string, string | string[] | undefined>) {
  const value = searchParams?.screenshot;

  if (Array.isArray(value)) {
    return value.includes('1');
  }

  return value === '1';
}

export default function FiguresMapPage({ searchParams }: FiguresMapPageProps) {
  const screenshot = isScreenshotMode(searchParams);

  return (
    <SketchShell
      eyebrow="Dashboard figure"
      title="Map figure"
      subtitle="A centered live map with districts, POIs, heat, and overlay controls for screenshot-friendly capture."
      screenshot={screenshot}
    >
      <MapFigureClient screenshot={screenshot} />
    </SketchShell>
  );
}
