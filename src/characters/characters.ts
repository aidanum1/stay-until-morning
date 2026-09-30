import type { CharId } from '../narrative/types';

export interface CharacterDef {
  id: CharId;
  symbol: string;
  /** UI accent */
  color: string;
  /** secondary accent (gradients) */
  color2: string;
  /** placeholder art palette */
  hair: string;
  hairShine: string;
  outfit: string;
  outfit2: string;
  skin: string;
  /** relative height (1 = average); affects sprite scale */
  height: number;
  /** hair silhouette style for the placeholder painter */
  hairStyle: 'side' | 'fluffy' | 'wavy' | 'neat' | 'long' | 'thick' | 'soft' | 'tousled';
  routeTitleKey: string;
  music: string;
}

export const CHARACTERS: Record<CharId, CharacterDef> = {
  hamin: {
    id: 'hamin',
    symbol: '🌊',
    color: '#6f8cff',
    color2: '#c9d6ff',
    hair: '#141a2e',
    hairShine: '#3e5aa8',
    outfit: '#23305e',
    outfit2: '#3a3f4a',
    skin: '#f1d6c4',
    height: 1.03,
    hairStyle: 'side',
    routeTitleKey: 'route.hamin',
    music: 'hamin',
  },
  hyunjun: {
    id: 'hyunjun',
    symbol: '🌃',
    color: '#ff5fb0',
    color2: '#ffc2e6',
    hair: '#f28bb8',
    hairShine: '#ffd0e6',
    outfit: '#1c1c24',
    outfit2: '#efe6da',
    skin: '#f3d8c6',
    height: 1.0,
    hairStyle: 'fluffy',
    routeTitleKey: 'route.hyunjun',
    music: 'hyunjun',
  },
  charlie: {
    id: 'charlie',
    symbol: '☀️',
    color: '#ffb347',
    color2: '#ffe2a8',
    hair: '#6b4424',
    hairShine: '#d9964a',
    outfit: '#f3e6cc',
    outfit2: '#ffd35a',
    skin: '#eecdb2',
    height: 0.98,
    hairStyle: 'wavy',
    routeTitleKey: 'route.charlie',
    music: 'charlie',
  },
  haruta: {
    id: 'haruta',
    symbol: '🎞️',
    color: '#b48cff',
    color2: '#e3d4ff',
    hair: '#2e2230',
    hairShine: '#7a5aa8',
    outfit: '#3b3b44',
    outfit2: '#f4f2f0',
    skin: '#f2dac8',
    height: 0.99,
    hairStyle: 'neat',
    routeTitleKey: 'route.haruta',
    music: 'haruta',
  },
  justin: {
    id: 'justin',
    symbol: '🎧',
    color: '#ff4b55',
    color2: '#ffe0e2',
    hair: '#6a4a36',
    hairShine: '#b58a66',
    outfit: '#f5f5f7',
    outfit2: '#d62c3a',
    skin: '#efd2bd',
    height: 1.07,
    hairStyle: 'long',
    routeTitleKey: 'route.justin',
    music: 'justin',
  },
  songha: {
    id: 'songha',
    symbol: '⭐',
    color: '#5b7cff',
    color2: '#dfe6ff',
    hair: '#16141a',
    hairShine: '#40384a',
    outfit: '#1b2550',
    outfit2: '#efe8d8',
    skin: '#f0d4bf',
    height: 1.0,
    hairStyle: 'thick',
    routeTitleKey: 'route.songha',
    music: 'songha',
  },
  hanbi: {
    id: 'hanbi',
    symbol: '✏️',
    color: '#35c6b8',
    color2: '#c8f3ee',
    hair: '#2f8fa0',
    hairShine: '#8fe3e6',
    outfit: '#4a4d55',
    outfit2: '#2c2d33',
    skin: '#f2d9c7',
    height: 1.01,
    hairStyle: 'soft',
    routeTitleKey: 'route.hanbi',
    music: 'hanbi',
  },
  daniel: {
    id: 'daniel',
    symbol: '🌈',
    color: '#c38bff',
    color2: '#9ff3ff',
    hair: '#efe4c8',
    hairShine: '#ffffff',
    outfit: '#b9a8e8',
    outfit2: '#9ff3ff',
    skin: '#f3dac8',
    height: 1.01,
    hairStyle: 'tousled',
    routeTitleKey: 'route.daniel',
    music: 'daniel',
  },
};

export function accentFor(speaker: string): string {
  if (speaker in CHARACTERS) return CHARACTERS[speaker as CharId].color;
  if (speaker === 'echo') return '#9ff3ff';
  if (speaker === 'you') return '#f5e6ff';
  return '#c9c2ff';
}
