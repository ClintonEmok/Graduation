# Visualization Components

This folder contains the 3D cube scene, shader wiring, and interaction overlays. Key behavior:

- Adaptive time warping is applied in the vertex shader using a 1D data texture.
- Burst highlighting can use density or inter-arrival burstiness and is reflected in both 3D and 2D.
- Timeline playback steps are tied to the selected time resolution.
