import * as THREE from 'three';

type GhostingShaderOptions = {
  useColumns: boolean;
  typeMapSize: number;
  districtMapSize: number;
};

const buildUniformArray = (size: number): Float32Array => {
  const map = new Float32Array(size);
  map.fill(1);
  return map;
};

export const applyGhostingShader = (shader: any, options: GhostingShaderOptions) => {
  const { useColumns, typeMapSize, districtMapSize } = options;

  shader.uniforms.uTimePlane = { value: 0 };
  shader.uniforms.uRange = { value: 10 };
  shader.uniforms.uTransition = { value: 0 };
  shader.uniforms.uLodFactor = { value: 0 };
  shader.uniforms.uTimeMin = { value: 0 };
  shader.uniforms.uTimeMax = { value: 100 };
  shader.uniforms.uSliceRanges = { value: new Float32Array(40) }; // 20 vec2s as flat array
  shader.uniforms.uSliceCount = { value: 0 };
  shader.uniforms.uShowContext = { value: 1 };
  shader.uniforms.uContextOpacity = { value: 0.1 };
  shader.uniforms.uUseColumns = { value: useColumns ? 1 : 0 };
  shader.uniforms.uTypeMap = { value: buildUniformArray(typeMapSize) };
  shader.uniforms.uDistrictMap = { value: buildUniformArray(districtMapSize) };
  shader.uniforms.uBoundsMin = { value: new THREE.Vector2(0, 0) };
  shader.uniforms.uBoundsMax = { value: new THREE.Vector2(0, 0) };
  shader.uniforms.uDataBoundsMin = { value: new THREE.Vector2(0, 0) }; // x, z min
  shader.uniforms.uDataBoundsMax = { value: new THREE.Vector2(1, 1) }; // x, z max
  shader.uniforms.uHasBounds = { value: 0 };
  shader.uniforms.uHasSelection = { value: 0 };
  shader.uniforms.uSelectedIndex = { value: -1 };
  shader.uniforms.uBrushStart = { value: 0 };
  shader.uniforms.uBrushEnd = { value: 100 };

  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `
    #include <common>
    uniform float uTransition;
    uniform float uLodFactor;
    uniform float uUseColumns;
    uniform vec2 uDataBoundsMin;
    uniform vec2 uDataBoundsMax;

    attribute float adaptiveY;
    attribute float colX;
    attribute float colZ;
    attribute float colLinearY;
    attribute float filterType;
    attribute float filterDistrict;

    varying float vWorldY;
    varying float vWorldX;
    varying float vWorldZ;
    varying float vLinearY;
    varying float vFilterType;
    varying float vFilterDistrict;
    varying float vInstanceId;
    `
  );

  shader.vertexShader = shader.vertexShader.replace(
    '#include <project_vertex>',
    `
    float currentY = mix(colLinearY, adaptiveY, uTransition);
    
    // Position Projection
    vec3 worldPos;
    if (uUseColumns > 0.5) {
      float wx = ((colX - uDataBoundsMin.x) / (uDataBoundsMax.x - uDataBoundsMin.x) * 100.0) - 50.0;
      float wz = ((colZ - uDataBoundsMin.y) / (uDataBoundsMax.y - uDataBoundsMin.y) * 100.0) - 50.0;
      worldPos = vec3(wx, currentY, wz);
    } else {
      // In non-columnar mode, instanceMatrix already contains the position
      // but we still want to apply adaptive Y if needed.
      // However, mock data in this project is usually pre-calculated or uses instanceMatrix.
      // For simplicity, we assume instanceMatrix is correct for non-columnar.
      worldPos = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      worldPos.y = mix(worldPos.y, adaptiveY, uTransition);
    }

    // Shrink points as we zoom out (LOD)
    vec3 transformedCopy = transformed * (1.0 - uLodFactor);
    
    // Final position
    vec4 mvPosition = modelViewMatrix * vec4(worldPos + transformedCopy, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    vWorldX = worldPos.x;
    vWorldY = worldPos.y;
    vWorldZ = worldPos.z;
    vLinearY = uUseColumns > 0.5 ? colLinearY : worldPos.y;
    vFilterType = filterType;
    vFilterDistrict = filterDistrict;
    vInstanceId = float(gl_InstanceID);
    `
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <common>',
    `
    #include <common>
    uniform float uTimePlane;
    uniform float uRange;
    uniform float uTimeMin;
    uniform float uTimeMax;
    uniform vec2 uSliceRanges[20];
    uniform int uSliceCount;
    uniform float uShowContext;
    uniform float uContextOpacity;
    uniform float uLodFactor;
    uniform float uTypeMap[${typeMapSize}];
    uniform float uDistrictMap[${districtMapSize}];
    uniform vec2 uBoundsMin;
    uniform vec2 uBoundsMax;
    uniform float uHasBounds;
    uniform float uHasSelection;
    uniform float uSelectedIndex;
    uniform float uBrushStart;
    uniform float uBrushEnd;
    varying float vWorldY;
    varying float vWorldX;
    varying float vWorldZ;
    varying float vLinearY;
    varying float vFilterType;
    varying float vFilterDistrict;
    varying float vInstanceId;
    `
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <dithering_fragment>',
    `
    #include <dithering_fragment>
    
    // Global LOD fade out
    if (uLodFactor > 0.05) {
      // Checkerboard dither that gets more aggressive as uLodFactor increases
      float dither = mod(gl_FragCoord.x + gl_FragCoord.y, 2.0);
      if (uLodFactor > 0.8 || (uLodFactor > 0.4 && dither > 0.5)) {
        discard;
      }
    }

    float dist = abs(vWorldY - uTimePlane);
    if (dist > uRange) {
      gl_FragColor.rgb *= 0.2;
    }

    // Determine if point is selected/focused
    bool isSelected = true;

    // 1. Time Range Check (existing filter range)
    if (vLinearY < uTimeMin || vLinearY > uTimeMax) {
      isSelected = false;
    }

    // 2. Filter Check (Type & District)
    float typeIndex = clamp(floor(vFilterType + 0.5), 0.0, ${typeMapSize - 1}.0);
    float districtIndex = clamp(floor(vFilterDistrict + 0.5), 0.0, ${districtMapSize - 1}.0);
    float typeSelected = uTypeMap[int(typeIndex)];
    float districtSelected = uDistrictMap[int(districtIndex)];

    if (typeSelected < 0.5 || districtSelected < 0.5) {
      isSelected = false;
    }

    // 3. Spatial Bounds Check
    if (uHasBounds > 0.5) {
      bool outsideBounds = vWorldX < uBoundsMin.x || vWorldX > uBoundsMax.x || vWorldZ < uBoundsMin.y || vWorldZ > uBoundsMax.y;
      if (outsideBounds) {
        isSelected = false;
      }
    }

    // Apply Focus+Context Logic
    if (!isSelected) {
      if (uShowContext < 0.5) {
        discard; // Hide context completely if toggled off
      } else {
        // Dynamic opacity-based dithering
        // uContextOpacity controls how visible context points are (0.0 to 1.0)
        // Lower opacity = more aggressive dithering
        
        float opacity = uContextOpacity;
        
        // Brush Range Check - "Dim Others" logic
        // Points outside the brush range get extra dimming
        bool inBrushRange = vLinearY >= uBrushStart && vLinearY <= uBrushEnd;
        if (!inBrushRange) {
          // Extra ghosting for points outside the brush range
          opacity *= 0.1;
        }
        
        // Create a dithering threshold based on opacity
        // opacity 0.1 (very ghosted) -> high discard rate
        // opacity 0.5 (half visible) -> medium discard rate
        // opacity 1.0 (fully visible) -> no discard
        
        if (opacity < 0.99) {
          // Use a hash-based dither for smoother appearance
          float ditherValue = mod(gl_FragCoord.x * 0.37 + gl_FragCoord.y * 0.73, 1.0);
          
          // Adjust threshold: lower opacity = higher threshold = more discards
          float threshold = 1.0 - opacity;
          
          if (ditherValue < threshold) {
            discard;
          }
        }

        // Desaturate and dim based on opacity
        float luminance = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
        float desaturation = 0.7; // Keep some color but mostly gray
        gl_FragColor.rgb = mix(vec3(luminance), gl_FragColor.rgb, 1.0 - desaturation);
        
        // Dim more aggressively when opacity is low
        float dimFactor = 0.3 + (opacity * 0.4); // 0.3 to 0.7 range
        gl_FragColor.rgb *= dimFactor;
        gl_FragColor.a = 1.0; // Opaque pixels (after discard) avoids sorting issues
      }
    }

    // Selection Highlight (Single point click)
    if (uHasSelection > 0.5) {
      float isInstanceSelected = step(abs(vInstanceId - uSelectedIndex), 0.5);
      if (isInstanceSelected > 0.5) {
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), 0.45);
        gl_FragColor.a = 1.0;
      }
    }

    // Slice Highlighting
    for (int i = 0; i < 20; i++) {
      if (i >= uSliceCount) break;
      vec2 range = uSliceRanges[i];
      if (vLinearY >= range.x && vLinearY <= range.y) {
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), 0.6);
        gl_FragColor.a = 1.0;
      }
    }
    `
  );
};
