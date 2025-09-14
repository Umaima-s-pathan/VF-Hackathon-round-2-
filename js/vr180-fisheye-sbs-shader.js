/*
 VR180 fisheye SBS shader for A-Frame
 - Renders a single SBS equidistant-fisheye video as per-eye 180 sphere
 - eye: left | right selects half of the texture
*/
(function(){
  if (!AFRAME) return;

  AFRAME.registerShader('vr180-fisheye-sbs', {
    schema: {
      src: {type: 'map'},
      eye: {type: 'string', default: 'left'},
      fov: {type: 'number', default: 180}, // degrees
      vignette: {type: 'number', default: 0.0}, // 0..1 strength
      gamma: {type: 'number', default: 1.0},
      exposure: {type: 'number', default: 1.0}
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform sampler2D src;
      uniform float fov; // degrees
      uniform float vignette;
      uniform float gamma;
      uniform float exposure;
      uniform bool isLeft;
      varying vec3 vWorldPosition;

      // Convert world direction to view space and then to fisheye SBS UV
      // Assumptions:
      // - Equidistant fisheye: r = f * theta, mapped to circle in each half
      // - Left eye circle centered at (0.25,0.5), right at (0.75,0.5)
      vec2 dirToUV(vec3 worldPos) {
        // View-space direction
        vec3 d = normalize((viewMatrix * vec4(worldPos - cameraPosition, 0.0)).xyz);
        vec3 forward = vec3(0.0, 0.0, -1.0);

        // theta = angle from forward in view space
        float theta = acos(clamp(dot(d, forward), -1.0, 1.0));
        float FOV = radians(fov);
        float rNorm = theta / (FOV * 0.5); // 0 at center, 1 at edge (90deg for 180 FOV)

        // Azimuth angle around forward axis
        float phi = atan(d.y, d.x); // range [-pi,pi]

        // Map to unit circle (x,y)
        float r = rNorm;
        float cx = cos(phi) * r;
        float cy = sin(phi) * r;

        // Convert to video UVs. Each half occupies width 0.5 of full texture.
        vec2 center = isLeft ? vec2(0.25, 0.5) : vec2(0.75, 0.5);
        // Scale: vertical radius spans 0.5 of texture height; horizontal adjusted by aspect implied by SBS
        // Approximate x scale so the circle fits within each half (assumes circular fisheye fill)
        float xscale = 0.5; // half height equals 0.5, horizontal scale tuned for typical VR180 encodes
        float yscale = 0.5;
        vec2 uv = center + vec2(cx * xscale, cy * yscale);
        return uv;
      }

      void main(){
        vec2 uv = dirToUV(vWorldPosition);

        // Discard if outside [0,1]
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
          discard;
        }

        vec4 col = texture2D(src, uv);

        // Simple radial vignette (optional)
        if (vignette > 0.0) {
          vec2 c = vec2(isLeft ? 0.25 : 0.75, 0.5);
          float dist = distance(uv, c) / 0.5; // 0..~1
          float v = smoothstep(1.0, 0.6, dist);
          col.rgb *= mix(1.0, v, vignette);
        }

        // Tone adjustments
        col.rgb = pow(max(vec3(0.0), col.rgb * exposure), vec3(1.0 / max(0.001, gamma)));

        gl_FragColor = col;
      }
    `,
    init: function (data) {
      this.material = new THREE.ShaderMaterial({
        uniforms: {
          src: { value: null },
          fov: { value: data.fov },
          vignette: { value: data.vignette },
          gamma: { value: data.gamma },
          exposure: { value: data.exposure },
          isLeft: { value: data.eye === 'left' }
        },
        vertexShader: this.vertexShader,
        fragmentShader: this.fragmentShader,
        side: THREE.BackSide
      });
    },
    update: function (data) {
      if (data.src) {
        // A-Frame 'map' type provides a THREE.Texture (often a THREE.VideoTexture)
        this.material.uniforms.src.value = data.src;
        this.material.uniforms.src.value.needsUpdate = true;
      }
      this.material.uniforms.fov.value = data.fov;
      this.material.uniforms.vignette.value = data.vignette;
      this.material.uniforms.gamma.value = data.gamma;
      this.material.uniforms.exposure.value = data.exposure;
      this.material.uniforms.isLeft.value = (data.eye === 'left');
    },
    tick: function () {
      if (this.material && this.material.uniforms && this.material.uniforms.src && this.material.uniforms.src.value) {
        this.material.uniforms.src.value.needsUpdate = true;
      }
    }
  });
})();