import {
  ShaderFitOptions,
  ShaderMount,
  defaultObjectSizing,
  getShaderColorFromString,
  meshGradientFragmentShader,
} from '@paper-design/shaders';
import { EMBER_COLORS } from '../lib/ember-palette';

/**
 * "Ember": the hero's background glow. Paper Shaders' mesh gradient (Apache-2.0), moving through the burning
 * orange of the orange surface (src/lib/ember-palette.ts): slow enough to stay behind the text, with enough
 * range between its light and deep shades to be seen at a glance. The text keeps its contrast through its own
 * ground over the glow (hero-backdrop.css). Paper's ShaderMount owns the canvas: it sizes it to the layer,
 * pauses it off screen and frees it on dispose.
 */

/** At most a 1080p frame's worth of pixels: a background never needs more. */
const MAX_PIXELS = 1920 * 1080;
const SPEED = 0.52;
/** The frame a still (reduced-motion) glow shows: a few seconds in, where the shapes have formed. */
const STILL_FRAME = 6000;

export function mountEmber(host: HTMLElement, { still }: { still: boolean }): () => void {
  const colors = EMBER_COLORS.map((color) => getShaderColorFromString(color));
  const shader = new ShaderMount(
    host,
    meshGradientFragmentShader,
    {
      u_colors: colors,
      u_colorsCount: colors.length,
      u_distortion: 1,
      u_swirl: 0.68,
      u_grainMixer: 0.08,
      u_grainOverlay: 0.12,
      u_fit: ShaderFitOptions.cover,
      u_scale: 1.25,
      u_rotation: defaultObjectSizing.rotation,
      u_originX: defaultObjectSizing.originX,
      u_originY: defaultObjectSizing.originY,
      u_offsetX: defaultObjectSizing.offsetX,
      u_offsetY: defaultObjectSizing.offsetY,
      u_worldWidth: defaultObjectSizing.worldWidth,
      u_worldHeight: defaultObjectSizing.worldHeight,
    },
    undefined,
    still ? 0 : SPEED,
    still ? STILL_FRAME : 0,
    1,
    MAX_PIXELS,
  );
  return () => shader.dispose();
}
