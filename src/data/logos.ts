import type { ImageMetadata } from 'astro';
import apple from '../assets/logos/apple.png';
import burgerKingMono from '../assets/logos/burger-king-mono.svg';
import burgerKing from '../assets/logos/burger-king.svg';
import cmu from '../assets/logos/carnegie-mellon.svg';
import kfcBlack from '../assets/logos/kfc-black.svg';
import kfc from '../assets/logos/kfc.svg';
import linkedin from '../assets/logos/linkedin.svg';
import mcdonalds from '../assets/logos/mcdonalds.svg';
import nvidia from '../assets/logos/nvidia.png';
import pfChangs from '../assets/logos/pf-changs.png';
import shaurmaFood from '../assets/logos/shaurma-food.png';
import un from '../assets/logos/united-nations.png';

export interface Logo {
  name: string;
  src: ImageMetadata;
  /** Display height in px. */
  height: number;
  /** How to render on a light ground: full colour, black silhouette or greyscale. */
  treatment?: 'color' | 'silhouette' | 'mono';
  /** One-colour artwork for dark grounds, when a plain silhouette would lose detail. */
  mono?: ImageMetadata;
}

export const CUSTOMER_LOGOS: Logo[] = [
  { name: 'McDonald’s', src: mcdonalds, height: 52 },
  { name: 'KFC', src: kfc, height: 36 },
  { name: 'Burger King', src: burgerKing, mono: burgerKingMono, height: 58 },
  { name: 'Shaurma Food', src: shaurmaFood, height: 46 },
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
