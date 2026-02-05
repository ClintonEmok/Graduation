import * as THREE from 'three';

export const aggregationVertexShader = `
  uniform vec2 uDataBoundsMin;
  uniform vec2 uDataBoundsMax;
  uniform float uTimeMin;
  uniform float uTimeMax;
  uniform float uTypeMap[36];
  uniform float uDistrictMap[36];
  uniform vec2 uBoundsMin;
  uniform vec2 uBoundsMax;
  uniform float uHasBounds;
  uniform float uPointSize;

  attribute float filterType;
  attribute float filterDistrict;
  attribute float colX;
  attribute float colZ;
  attribute float colLinearY;

  varying float vDiscard;

  void main() {
    vDiscard = 0.0;

    // 1. Time Range Check
    if (colLinearY < uTimeMin || colLinearY > uTimeMax) {
      vDiscard = 1.0;
    }

    // 2. Filter Check (Type & District)
    int typeIndex = int(clamp(floor(filterType + 0.5), 0.0, 35.0));
    int districtIndex = int(clamp(floor(filterDistrict + 0.5), 0.0, 35.0));
    if (uTypeMap[typeIndex] < 0.5 || uDistrictMap[districtIndex] < 0.5) {
      vDiscard = 1.0;
    }

    // 3. Spatial Bounds Check
    if (uHasBounds > 0.5) {
      // Use world coordinates for spatial bounds check
      float worldX = ((colX - uDataBoundsMin.x) / (uDataBoundsMax.x - uDataBoundsMin.x) * 100.0) - 50.0;
      float worldZ = ((colZ - uDataBoundsMin.y) / (uDataBoundsMax.y - uDataBoundsMin.y) * 100.0) - 50.0;
      
      if (worldX < uBoundsMin.x || worldX > uBoundsMax.x || worldZ < uBoundsMin.y || worldZ > uBoundsMax.y) {
        vDiscard = 1.0;
      }
    }

    // Project to spatial plane (-50 to 50 range)
    float normX = (colX - uDataBoundsMin.x) / (uDataBoundsMax.x - uDataBoundsMin.x);
    float normZ = (colZ - uDataBoundsMin.y) / (uDataBoundsMax.y - uDataBoundsMin.y);
    
    // We map X to X and Z to Y for the 2D RenderTarget
    vec3 pos = vec3((normX * 100.0) - 50.0, (normZ * 100.0) - 50.0, 0.0);
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = uPointSize;
  }
`;

export const aggregationFragmentShader = `
  varying float vDiscard;

  void main() {
    if (vDiscard > 0.5) discard;

    vec2 uv = gl_PointCoord.xy - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    // Gaussian falloff
    float intensity = exp(-d * d * 20.0);
    
    gl_FragColor = vec4(intensity, 0.0, 0.0, 1.0);
  }
`;

export const heatmapVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const heatmapFragmentShader = `
  uniform sampler2D tDensity;
  uniform float uMaxIntensity;
  uniform float uIntensityScale;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    float density = texture2D(tDensity, vUv).r * uIntensityScale;
    if (density <= 0.001) discard;

    // Logarithmic scale: log(1.0 + density) / log(1.0 + maxIntensity)
    float logDensity = log(1.0 + density) / log(1.0 + uMaxIntensity);
    logDensity = clamp(logDensity, 0.0, 1.0);

    // Monochromatic Cyan-White Gradient
    vec3 cyan = vec3(0.0, 1.0, 1.0);
    vec3 white = vec3(1.0, 1.0, 1.0);
    vec3 color = mix(cyan, white, logDensity);

    gl_FragColor = vec4(color, logDensity * uOpacity);
  }
`;
