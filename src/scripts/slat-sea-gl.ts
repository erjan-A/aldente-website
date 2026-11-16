import { SLAT, glintZone, slatGrid } from '../lib/slats';

/**
 * The wall of small slats behind the closing band: each slat is shaded by a slow swell seen in perspective,
 * so the wall reads as a rolling sea with light on its crests (after React Bits' "Micro Slats"; this is our
 * own single shader, with no library). The troughs darken the orange ground; the light crests show only where
 * glintZone() allows, away from the white text.
 */
const TROUGH = [0.3, 0.04, 0.0]; // deep red-brown: the shade of a trough
const CREST = [1.0, 0.66, 0.46]; // warm light on a crest
/** At most this many pixels: a background never needs more. */
const MAX_PIXELS = 2_400_000;
const SPEED = 0.45;
/** The moment a still (reduced-motion) wall shows. */
const STILL_TIME = 14;

const VERTEX = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

const FRAGMENT = `
precision highp float;
uniform vec2 uSize;
uniform float uDpr;
uniform vec4 uGrid;
uniform vec2 uOrigin;
uniform vec2 uSlat;
uniform float uTime;
uniform vec3 uZone;
uniform vec3 uTrough;
uniform vec3 uCrest;

float pill(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float swell(vec2 world, float turn, float len, float shift, float meander) {
  float angle = 4.36 + turn;
  float k = 6.2831853 / len;
  float theta = k * dot(world, vec2(cos(angle), sin(angle))) - sqrt(9.81 * k) * 0.35 * uTime + shift + meander;
  return cos(theta) + 0.25 * cos(2.0 * theta);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr;
  vec2 local = p - uOrigin;
  vec2 cell = floor(local / uGrid.zw);
  vec2 center = uOrigin + cell * uGrid.zw + uSlat * 0.5;
  float v = clamp(center.y / uSize.y, 0.0, 1.0);

  // The sea lies flat and runs away from the viewer: the top of the band is the far water.
  float horizon = 1.6;
  float depth = (1.0 + horizon) / (v + horizon);
  vec2 world = vec2((center.x - uSize.x * 0.5) / max(uSize.y, 480.0) * depth, (depth - 1.0) * horizon * 2.2) / 0.34;
  float meander = 0.55 * sin(dot(world, vec2(0.23, 0.41)) * 0.9 + uTime * 0.13) + 0.3 * sin(dot(world, vec2(-0.37, 0.19)) * 1.4 - uTime * 0.09);

  float height = swell(world, 0.0, 2.6, 0.0, meander * 0.6)
    + 0.75 * swell(world, -0.95, 1.7, 2.3, meander * 0.9)
    + 0.5 * swell(world, 0.78, 1.12, 4.1, meander * 1.2)
    + 0.3 * swell(world, 1.62, 0.76, 1.1, meander * 1.5);
  float level = smoothstep(0.24, 0.76, 0.5 + 0.5 * height / 2.7);
  float crest = smoothstep(0.62, 1.0, level);

  // Far water fades into the ground.
  float haze = mix(0.4, 1.0, v);
  float zone = smoothstep(uZone.y, uZone.z, mix(p.x / uSize.x, p.y / uSize.y, uZone.x));
  // Under the text the wall is quiet; in the open part of the band it rolls at full strength.
  float strength = mix(0.3, 1.0, zone);
  float light = crest * zone * haze;
  float shade = (0.07 + 0.8 * pow(1.0 - level, 1.2) * strength) * haze;

  vec2 offset = local - cell * uGrid.zw - uSlat * 0.5;
  vec2 halfSize = uSlat * 0.5 * vec2(1.0, mix(0.4, 1.0, level));
  float body = clamp(0.5 - pill(offset, halfSize, 0.75 * halfSize.x) * uDpr, 0.0, 1.0);
  float inside = step(0.0, cell.x) * step(cell.x, uGrid.x - 1.0) * step(0.0, cell.y) * step(cell.y, uGrid.y - 1.0);

  float alpha = body * inside * mix(shade, 0.92, light);
  gl_FragColor = vec4(mix(uTrough, uCrest, light) * alpha, alpha);
}`;

export interface SlatWall {
  /** Start or stop the motion (the wall stays drawn while stopped). */
  run(on: boolean): void;
  dispose(): void;
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('slats: no shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`slats: ${gl.getShaderInfoLog(shader) ?? 'compile failed'}`);
  return shader;
}

export function mountSlats(host: HTMLElement, { still }: { still: boolean }): SlatWall {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
  if (!gl) throw new Error('slats: no webgl');

  // A shader this device rejects must not leave its context behind.
  let program: WebGLProgram | null = null;
  try {
    program = gl.createProgram();
    if (!program) throw new Error('slats: no program');
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('slats: link failed');
  } catch (error) {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    throw error;
  }
  gl.useProgram(program);

  // One triangle that covers the canvas.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const linked = program;
  const at = (name: string) => gl.getUniformLocation(linked, name);
  const uniform = { size: at('uSize'), dpr: at('uDpr'), grid: at('uGrid'), origin: at('uOrigin'), slat: at('uSlat'), time: at('uTime'), zone: at('uZone') };
  gl.uniform3fv(at('uTrough'), TROUGH);
  gl.uniform3fv(at('uCrest'), CREST);
  gl.uniform2f(uniform.slat, SLAT.width, SLAT.height);
  host.append(canvas);

  let frame = 0;
  let running = false;
  let seconds = still ? STILL_TIME : 0;
  let last = 0;

  const draw = () => {
    gl.uniform1f(uniform.time, seconds);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(MAX_PIXELS / (width * height)));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const grid = slatGrid(width, height);
    const zone = glintZone(width);
    gl.uniform2f(uniform.size, width, height);
    gl.uniform1f(uniform.dpr, canvas.width / width);
    gl.uniform4f(uniform.grid, grid.cols, grid.rows, grid.cell[0], grid.cell[1]);
    gl.uniform2f(uniform.origin, grid.origin[0], grid.origin[1]);
    gl.uniform3f(uniform.zone, zone.axis === 'y' ? 1 : 0, zone.from, zone.to);
    draw();
  };

  const tick = (now: number) => {
    // A long gap (a hidden tab) never makes the sea jump.
    seconds += Math.min((now - last) / 1000, 0.05) * SPEED;
    last = now;
    draw();
    frame = requestAnimationFrame(tick);
  };

  const sizes = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  sizes?.observe(host);
  resize();

  return {
    run(on) {
      if (still || on === running) return;
      running = on;
      cancelAnimationFrame(frame);
      if (on) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    },
    dispose() {
      running = false;
      cancelAnimationFrame(frame);
      sizes?.disconnect();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
    },
  };
}
