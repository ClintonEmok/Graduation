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

  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `
    #include <common>
    uniform float uTransition;
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
    vec4 mvPosition = vec4( transformed, 1.0 );

    float currentY = 0.0;

    if (uUseColumns > 0.5) {
       // Normalize X and Z based on data bounds to 0-1, then scale to grid (-50 to 50)
       float normX = (colX - uDataBoundsMin.x) / (uDataBoundsMax.x - uDataBoundsMin.x);
       float normZ = (colZ - uDataBoundsMin.y) / (uDataBoundsMax.y - uDataBoundsMin.y);
       
       mvPosition.x += (normX * 100.0) - 50.0;
       mvPosition.z += (normZ * 100.0) - 50.0;
       currentY = colLinearY;
       mvPosition.y += colLinearY;
    } else {
       #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
          currentY = instanceMatrix[3].y;
       #endif
    }

    float targetY = adaptiveY;
    float yShift = (targetY - currentY) * uTransition;
    mvPosition.y += yShift;

    vWorldY = mvPosition.y;
    vWorldX = mvPosition.x;
    vWorldZ = mvPosition.z;
    vLinearY = currentY;
    vFilterType = filterType;
    vFilterDistrict = filterDistrict;
    #ifdef USE_INSTANCING
      vInstanceId = float(gl_InstanceID);
    #else
      vInstanceId = 0.0;
    #endif

    mvPosition = modelViewMatrix * mvPosition;

    gl_Position = projectionMatrix * mvPosition;
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
    uniform float uTypeMap[${typeMapSize}];
    uniform float uDistrictMap[${districtMapSize}];
    uniform vec2 uBoundsMin;
    uniform vec2 uBoundsMax;
    uniform float uHasBounds;
    uniform float uHasSelection;
    uniform float uSelectedIndex;
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

    float dist = abs(vWorldY - uTimePlane);
    if (dist > uRange) {
      gl_FragColor.rgb *= 0.2;
    }

    // Determine if point is selected/focused
    bool isSelected = true;

    // 1. Time Range Check
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
        // Dithering Pattern for Transparency
        // Use screen coordinates to create a stipple pattern
        // (x + y) % 2.0 > 0.5 gives a checkerboard
        
        // Adjust density based on opacity preference? 
        // For now, fixed 50% dither for context, plus alpha blending for color fade
        
        // Simple 2x2 Bayer matrix simulation or just mod pattern
        if (mod(gl_FragCoord.x + gl_FragCoord.y, 2.0) > 0.5) {
            discard; 
        }

        // Desaturate and dim
        float luminance = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
        gl_FragColor.rgb = mix(vec3(luminance), gl_FragColor.rgb, 0.0); // Fully desaturated (grayscale)
        gl_FragColor.rgb *= 0.5; // Dimmed
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
