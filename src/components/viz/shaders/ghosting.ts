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
  shader.uniforms.uUseColumns = { value: useColumns ? 1 : 0 };
  shader.uniforms.uTypeMap = { value: buildUniformArray(typeMapSize) };
  shader.uniforms.uDistrictMap = { value: buildUniformArray(districtMapSize) };
  shader.uniforms.uBoundsMin = { value: new THREE.Vector2(0, 0) };
  shader.uniforms.uBoundsMax = { value: new THREE.Vector2(0, 0) };
  shader.uniforms.uHasBounds = { value: 0 };
  shader.uniforms.uHasSelection = { value: 0 };
  shader.uniforms.uSelectedIndex = { value: -1 };

  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `
    #include <common>
    uniform float uTransition;
    uniform float uUseColumns;

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
       mvPosition.x += colX;
       mvPosition.z += colZ;
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

    if (vLinearY < uTimeMin || vLinearY > uTimeMax) {
      float luminance = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
      gl_FragColor.rgb = mix(vec3(luminance), gl_FragColor.rgb, 0.2);
      gl_FragColor.a *= 0.1;
    }

    float typeIndex = clamp(floor(vFilterType + 0.5), 0.0, ${typeMapSize - 1}.0);
    float districtIndex = clamp(floor(vFilterDistrict + 0.5), 0.0, ${districtMapSize - 1}.0);
    float typeSelected = uTypeMap[int(typeIndex)];
    float districtSelected = uDistrictMap[int(districtIndex)];

    if (typeSelected < 0.5 || districtSelected < 0.5) {
      float luminance = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
      gl_FragColor.rgb = mix(vec3(luminance), gl_FragColor.rgb, 0.2);
      gl_FragColor.a *= 0.05;
    }

    if (uHasBounds > 0.5) {
      bool outsideBounds = vWorldX < uBoundsMin.x || vWorldX > uBoundsMax.x || vWorldZ < uBoundsMin.y || vWorldZ > uBoundsMax.y;
      if (outsideBounds) {
        float luminance = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
        gl_FragColor.rgb = mix(vec3(luminance), gl_FragColor.rgb, 0.2);
        gl_FragColor.a *= 0.05;
      }
    }

    if (uHasSelection > 0.5) {
      float isSelected = step(abs(vInstanceId - uSelectedIndex), 0.5);
      if (isSelected > 0.5) {
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), 0.45);
        gl_FragColor.a = min(1.0, gl_FragColor.a + 0.4);
      }
    }
    `
  );
};
