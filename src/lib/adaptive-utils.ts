export const ADAPTIVE_BIN_COUNT = 1024;
export const ADAPTIVE_KERNEL_WIDTH = 3; // Smoothing kernel width in bins
// Burstiness-driven temporal scaling: weight is taken from the Goh-Barabasi
// burstiness signal B in [-1, 1] remapped to [0, 1]. Density is no longer
// part of the weight construction; the default lambda=1.0 makes the scaling
// purely burstiness-driven. The constant is kept as a parameter so the
// hybrid mode remains available for ablation and reporting.
export const ADAPTIVE_BURST_INFLUENCE = 1.0;
