This is a Next.js prototype for an Adaptive Space-Time Cube.

## Overview

The app links a 3D space-time cube, a 2D map, and a dual timeline. Adaptive time scaling highlights bursty intervals by expanding dense time regions and compressing sparse ones.

## Key Interactions

- Timeline supports overview + detail brushing and point selection.
- Time Resolution slider changes the timeline granularity (seconds → years) and updates the detail window span.
- Playback and step controls advance by the selected time resolution.
- Adaptive Controls adjust warp strength, burst metric (density vs inter-arrival burstiness), and highlighting percentile.
- Bursty points are highlighted in both 3D and 2D views.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Notes

- Adaptive time warping is computed in a Web Worker and applied via a shader data texture.
- Burst highlighting uses the density map percentile cutoff.
