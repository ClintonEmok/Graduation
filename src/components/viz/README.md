# Visualization Components

This folder contains the 3D cube scene, shader wiring, and interaction overlays. Key behavior:

- Adaptive time warping is applied in the vertex shader using a 1D data texture.
- Burst highlighting is driven by the density map percentile cutoff and reflected in both 3D and 2D.
