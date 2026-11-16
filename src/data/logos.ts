import type { ImageMetadata } from 'astro';
import apple from '../assets/logos/apple.png';
import birdline from '../assets/logos/birdline-chicken.png';
import burgerKingMono from '../assets/logos/burger-king-mono.svg';
import cmu from '../assets/logos/carnegie-mellon.svg';
import kfcBlack from '../assets/logos/kfc-black.svg';
import kfc from '../assets/logos/kfc.svg';
import limepost from '../assets/logos/limepost-tacos.png';
import linkedin from '../assets/logos/linkedin.svg';
import mcdonalds from '../assets/logos/mcdonalds.svg';
import meltShack from '../assets/logos/melt-shack.png';
import nvidia from '../assets/logos/nvidia.png';
import pfChangs from '../assets/logos/pf-changs.png';
import un from '../assets/logos/united-nations.png';

export interface Logo {
  name: string;
  src: ImageMetadata;
  /** Display height in px. */
  height: number;
  /** How to render on a light ground: black silhouette or greyscale. Without it the artwork shows as drawn. */
  treatment?: 'silhouette' | 'mono';
  /** One-colour artwork for dark grounds, when a plain silhouette would lose detail. */
  mono?: ImageMetadata;
}

// The three larger chains mixed with three newer customers. The newer three are one-tone artwork made from
// their colour logos (2026-11-16), so the whole row reads in one tone.
export const CUSTOMER_LOGOS: Logo[] = [
  { name: 'McDonald’s', src: mcdonalds, height: 52 },
  { name: 'Melt Shack', src: meltShack, height: 60 },
  { name: 'KFC', src: kfc, height: 36 },
  { name: 'Birdline Chicken', src: birdline, height: 48 },
  { name: 'Burger King', src: burgerKingMono, height: 58 },
  { name: 'Limepost Tacos', src: limepost, height: 52 },
];

export const TEAM_LOGOS: Logo[] = [
  { name: 'P.F. Chang’s', src: pfChangs, height: 22, treatment: 'silhouette' },
  { name: 'KFC', src: kfcBlack, height: 24 },
  { name: 'LinkedIn', src: linkedin, height: 26, treatment: 'mono' },
  { name: 'Apple', src: apple, height: 32, treatment: 'silhouette' },
  { name: 'NVIDIA', src: nvidia, height: 36, treatment: 'silhouette' },
  { name: 'Carnegie Mellon University', src: cmu, height: 22, treatment: 'silhouette' },
  { name: 'United Nations', src: un, height: 40, treatment: 'silhouette' },
];
