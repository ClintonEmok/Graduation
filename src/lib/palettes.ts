export type Theme = 'light' | 'dark' | 'colorblind';

export interface Palette {
  name: string;
  background: string; // 3D Scene background
  foreground: string; // Text color (approx)
  fog: string; // Fog color
  mapStyle: string; // MapLibre style URL
  categoryColors: Record<string, string>;
}

export const OKABE_ITO = {
  black: '#000000',
  orange: '#E69F00',
  skyBlue: '#56B4E9',
  bluishGreen: '#009E73',
  yellow: '#F0E442',
  blue: '#0072B2',
  vermilion: '#D55E00',
  reddishPurple: '#CC79A7',
  grey: '#999999',
};

const DEFAULT_CATEGORY_COLORS = {
  'THEFT': '#FFD700', // Gold
  'ASSAULT': '#FF4500', // OrangeRed
  'BURGLARY': '#1E90FF', // DodgerBlue
  'ROBBERY': '#32CD32', // LimeGreen
  'VANDALISM': '#DA70D6', // Orchid
  'OTHER': '#FFFFFF',
};

// Normalize keys to match CRIME_TYPE_MAP (uppercase)
const COLORBLIND_CATEGORY_COLORS = {
  'THEFT': OKABE_ITO.yellow,
  'ASSAULT': OKABE_ITO.vermilion,
  'BURGLARY': OKABE_ITO.skyBlue,
  'ROBBERY': OKABE_ITO.bluishGreen,
  'VANDALISM': OKABE_ITO.reddishPurple,
  'OTHER': OKABE_ITO.grey,
};

const LIGHT_CATEGORY_COLORS = {
  'THEFT': '#B8860B', // DarkGoldenRod (darker for contrast on white)
  'ASSAULT': '#CC3700', // Darker OrangeRed
  'BURGLARY': '#0066CC', // Darker DodgerBlue
  'ROBBERY': '#008000', // Darker Green
  'VANDALISM': '#9932CC', // DarkOrchid
  'OTHER': '#666666',
};

export const PALETTES: Record<Theme, Palette> = {
  dark: {
    name: 'Dark (Default)',
    background: '#000000',
    foreground: '#FFFFFF',
    fog: '#000000',
    mapStyle: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    categoryColors: DEFAULT_CATEGORY_COLORS,
  },
  light: {
    name: 'Light',
    background: '#FFFFFF',
    foreground: '#000000',
    fog: '#FFFFFF',
    mapStyle: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    categoryColors: LIGHT_CATEGORY_COLORS,
  },
  colorblind: {
    name: 'Colorblind Safe',
    background: '#000000', // Keep dark background for high contrast with these colors
    foreground: '#FFFFFF',
    fog: '#000000',
    mapStyle: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    categoryColors: COLORBLIND_CATEGORY_COLORS,
  },
};

export const DEFAULT_THEME: Theme = 'dark';
