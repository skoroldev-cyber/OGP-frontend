import { EARTH_TIERS } from '@/config/ogpTheme';
import { assetUrl } from '@/config/env';

export const ASSET_GROUPS = Object.freeze({
  OPENING: 'OPENING',
  EARTH: 'EARTH',
  READING_CORE: 'READING_CORE',
  PATHWAYS: 'PATHWAYS',
});

export const GROUP_LOAD_ORDER = Object.freeze([
  ASSET_GROUPS.OPENING,
  ASSET_GROUPS.EARTH,
  ASSET_GROUPS.READING_CORE,
  ASSET_GROUPS.PATHWAYS,
]);

const OPENING_ASSETS = [
  { url: '/textures/opening/speck_soft.webp', type: 'texture' },
  { url: '/brand/logo2/weave_guides.json', type: 'data' },
  { url: '/textures/opening/weave_strand.webp', type: 'texture' },
  { url: '/textures/opening/weave_strand_glow.webp', type: 'texture', hoverOnly: false },
  { url: '/textures/opening/depth_mote.webp', type: 'texture' },
  { url: '/textures/opening/passage_bands.webp', type: 'texture' },
  { url: '/textures/space/starfield_soft.webp', type: 'texture' },
];

export const earthAssetsForTier = (tier) => {
  const spec = EARTH_TIERS[tier] ?? EARTH_TIERS.LOW;
  const assets = [
    { url: `/textures/earth/surface_${spec.resolutionKey}.webp`, type: 'texture' },
    { url: `/textures/earth/clouds_${spec.cloudResolutionKey}.webp`, type: 'texture' },
    { url: `/textures/earth/ocean_mask_${spec.cloudResolutionKey}.webp`, type: 'texture' },
  ];
  if (spec.useNightSide) {
    assets.push({ url: `/textures/earth/night_${spec.cloudResolutionKey}.webp`, type: 'texture' });
  }
  if (tier === 'LOW') {
    assets.push({ url: '/video/earth_hero.webm', type: 'video', preload: false });
  }
  assets.push({ url: '/images/earth_hero_still.webp', type: 'image' });
  return assets;
};

const READING_CORE_ASSETS = [
  { url: '/fonts/literata-variable.woff2', type: 'font' },
  { url: '/fonts/inter-variable.woff2', type: 'font' },
  { url: '/textures/room/field_gradient.webp', type: 'texture' },
  { url: '/textures/room/manuscript_artifact.webp', type: 'texture' },
  { url: '/logo/main-logo-64.png', type: 'image' },
  { url: '/logo/main-logo-128.png', type: 'image' },
  { url: '/sounds/field_air_distant.ogg', type: 'audio', preload: false },
  { url: '/sounds/field_water_low.ogg', type: 'audio', preload: false },
  { url: '/sounds/earth_harmonic_open.ogg', type: 'audio', preload: false },
  { url: '/sounds/room_tone_reading.ogg', type: 'audio', preload: false },
];

const PATHWAYS_ASSETS = [
  { url: '/textures/pathways/panel_field.webp', type: 'texture' },
  { url: '/brand/logo2/canonical_512.webp', type: 'image' },
];

export const assetsForGroup = (group, tier) => {
  switch (group) {
    case ASSET_GROUPS.OPENING:
      return OPENING_ASSETS;
    case ASSET_GROUPS.EARTH:
      return earthAssetsForTier(tier);
    case ASSET_GROUPS.READING_CORE:
      return READING_CORE_ASSETS;
    case ASSET_GROUPS.PATHWAYS:
      return PATHWAYS_ASSETS;
    default:
      return [];
  }
};

export const filterAssetsByDevice = (assets, options = {}) => {
  const { supportsHover = true, tier = 'HIGH', includeOnDemand = false } = options;
  return assets.filter((asset) => {
    if (asset.preload === false && !includeOnDemand) return false;
    if (asset.hoverOnly && !supportsHover) return false;
    if (Array.isArray(asset.tiers) && !asset.tiers.includes(tier)) return false;
    return true;
  });
};

export const groupsForTier = (tier) =>
  tier === 'LOW'
    ? [ASSET_GROUPS.OPENING, ASSET_GROUPS.READING_CORE]
    : [...GROUP_LOAD_ORDER];

export const urlsForGroup = (group, options = {}) => {
  const tier = options.tier ?? 'HIGH';
  return filterAssetsByDevice(assetsForGroup(group, tier), { ...options, tier }).map((asset) =>
    assetUrl(asset.url),
  );
};

const warmed = new Set();

const warmOne = async (url) => {
  if (warmed.has(url)) return true;
  warmed.add(url);
  try {
    const response = await fetch(url, { credentials: 'omit', cache: 'force-cache' });
    return response.ok;
  } catch {
    return false;
  }
};

export const warmGroup = async (group, options = {}) => {
  const urls = urlsForGroup(group, options);
  const results = await Promise.all(urls.map((url) => warmOne(url)));
  return {
    group,
    requested: urls.length,
    arrived: results.filter(Boolean).length,
  };
};

export default ASSET_GROUPS;
