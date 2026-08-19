/**
 * State-aligned asset manifest — successor to itom's `texturePreloadList.js` (master §7.7).
 *
 * Groups are aligned to the experience states, not to rooms, so `assetsReady(group)` can
 * gate a transition (§7.2.1) and so each group can be sequenced AHEAD of need:
 *
 *   OPENING       loaded during S0–S1, behind the darkness
 *   EARTH         loaded during S3–S5, so S7 never waits
 *   READING_CORE  loaded during S6–S7, so S9 never waits on room-scale assets
 *   PATHWAYS      loaded during S10+, idle
 *
 * Loading is masked entirely by S1 darkness. There is no visible loading machinery
 * anywhere — no spinner, no percentage, no progress bar (BUILD_CONTRACT §0.6).
 *
 * OOM GUARD (carried from itom): LOW-tier devices preload OPENING + READING_CORE only.
 * The heavy Earth tranche and the pathway assets are fetched on demand there instead.
 *
 * MISSING ASSETS ARE NON-FATAL. Every warm-up path here settles rather than rejects: a
 * 404 must degrade the picture, never block the pipeline or surface an error to a reader.
 */

import { EARTH_TIERS } from '@/config/ogpTheme';
import { assetUrl } from '@/config/env';

/**
 * @typedef {Object} AssetDescriptor
 * @property {string} url            absolute /public path (CDN prefix applied at load time)
 * @property {'texture'|'data'|'font'|'audio'|'image'|'video'} type
 * @property {boolean} [hoverOnly]   the `_glow` twin of a dark/dormant texture — never
 *                                   fetched on touch-only devices (itom idiom, §7.9)
 * @property {string[]} [tiers]      restrict to these device tiers
 * @property {boolean} [preload]     default true; `false` = fetched on demand only
 */

/** Group names, in load order. */
export const ASSET_GROUPS = Object.freeze({
  OPENING: 'OPENING',
  EARTH: 'EARTH',
  READING_CORE: 'READING_CORE',
  PATHWAYS: 'PATHWAYS',
});

/** Load order used whenever a caller needs the groups sequenced. */
export const GROUP_LOAD_ORDER = Object.freeze([
  ASSET_GROUPS.OPENING,
  ASSET_GROUPS.EARTH,
  ASSET_GROUPS.READING_CORE,
  ASSET_GROUPS.PATHWAYS,
]);

/* -------------------------------------------------------------------------- */
/* OPENING — S0–S5: speck, weave guide data, passage, starfield                */
/* -------------------------------------------------------------------------- */

/** @type {AssetDescriptor[]} */
const OPENING_ASSETS = [
  // S2 distant speck — a soft billboard falloff sprite, not a logo bitmap (§2.4.3).
  { url: '/textures/opening/speck_soft.webp', type: 'texture' },
  // S3–S4 Living Weave. Guide splines are DATA, never hardcoded geometry, so the
  // Phase 2 Living Origin Field can replace the input without a re-choreography (§7.4.1).
  { url: '/brand/logo2/weave_guides.json', type: 'data' },
  { url: '/textures/opening/weave_strand.webp', type: 'texture' },
  { url: '/textures/opening/weave_strand_glow.webp', type: 'texture', hoverOnly: false },
  // Depth motes that keep the void from reading as flat black (§2.4.2).
  { url: '/textures/opening/depth_mote.webp', type: 'texture' },
  // S6 Weave Passage — the resurrected tunnel primitive (§7.3).
  { url: '/textures/opening/passage_bands.webp', type: 'texture' },
  // Restrained starfield: dark, quiet, humble, not sci-fi (§7.4.2).
  { url: '/textures/space/starfield_soft.webp', type: 'texture' },
];

/* -------------------------------------------------------------------------- */
/* EARTH — S7 and the Reading Room ambient presence                            */
/* -------------------------------------------------------------------------- */

/**
 * Earth textures are tier-resolved: HIGH 8k surface + 4k clouds, MEDIUM 4k + 2k,
 * LOW 2k + 1k (§7.7). Sources are NASA Blue Marble Next Generation for the surface
 * base and DSCOVR EPIC for colour/light truth; provenance is logged per texture (§7.7).
 * Attribute "NASA"; never imply endorsement.
 *
 * @param {'HIGH'|'MEDIUM'|'LOW'} tier
 * @returns {AssetDescriptor[]}
 */
export const earthAssetsForTier = (tier) => {
  const spec = EARTH_TIERS[tier] ?? EARTH_TIERS.LOW;
  const assets = [
    { url: `/textures/earth/surface_${spec.resolutionKey}.webp`, type: 'texture' },
    { url: `/textures/earth/clouds_${spec.cloudResolutionKey}.webp`, type: 'texture' },
    { url: `/textures/earth/ocean_mask_${spec.cloudResolutionKey}.webp`, type: 'texture' },
  ];
  if (spec.useNightSide) {
    // Night side is deliberately restrained — "Earth as mother, not civilization as
    // machinery" (§7.4.2). Optional by design; its absence is a valid picture.
    assets.push({ url: `/textures/earth/night_${spec.cloudResolutionKey}.webp`, type: 'texture' });
  }
  // LOW tier keeps a pre-rendered still/segment ladder as its first-class alternative
  // (§7.4.2 [PROPOSED] real-time-first with a captured fallback).
  if (tier === 'LOW') {
    assets.push({ url: '/video/earth_hero.webm', type: 'video', preload: false });
  }
  assets.push({ url: '/images/earth_hero_still.webp', type: 'image' });
  return assets;
};

/* -------------------------------------------------------------------------- */
/* READING_CORE — S8–S13: the room, the fonts, the UI                          */
/* -------------------------------------------------------------------------- */

/** @type {AssetDescriptor[]} */
const READING_CORE_ASSETS = [
  // Self-hosted faces. index.html preloads these too; listing them keeps the readiness
  // gate honest — the manuscript may not be shown in a fallback face (§7.7).
  { url: '/fonts/literata-variable.woff2', type: 'font' },
  { url: '/fonts/inter-variable.woff2', type: 'font' },
  // The room itself is deliberately thin: "quieter, not more elaborate" (§3.3).
  { url: '/textures/room/field_gradient.webp', type: 'texture' },
  { url: '/textures/room/manuscript_artifact.webp', type: 'texture' },
  // The woven mark in the reading-room chrome — the first identity the reader is shown, and
  // the only one, so it must be there when the room opens rather than a beat afterwards. Both
  // densities are warmed: which one is fetched is the browser's `srcset` decision, and warming
  // only the 1x would leave every retina reader downloading the mark on arrival anyway.
  { url: '/logo/main-logo-64.png', type: 'image' },
  { url: '/logo/main-logo-128.png', type: 'image' },
  // Opt-in natural field recordings. `preload: false` is a privacy and consent decision,
  // not a performance one: nothing is fetched until the reader enables sound (§2.9).
  { url: '/sounds/field_air_distant.ogg', type: 'audio', preload: false },
  { url: '/sounds/field_water_low.ogg', type: 'audio', preload: false },
  { url: '/sounds/earth_harmonic_open.ogg', type: 'audio', preload: false },
  { url: '/sounds/room_tone_reading.ogg', type: 'audio', preload: false },
];

/* -------------------------------------------------------------------------- */
/* PATHWAYS — S14                                                              */
/* -------------------------------------------------------------------------- */

/** @type {AssetDescriptor[]} */
const PATHWAYS_ASSETS = [
  { url: '/textures/pathways/panel_field.webp', type: 'texture' },
  { url: '/brand/logo2/canonical_512.webp', type: 'image' },
];

/* -------------------------------------------------------------------------- */
/* Selection                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * All descriptors for a group, before device filtering.
 *
 * @param {string} group one of `ASSET_GROUPS`
 * @param {'HIGH'|'MEDIUM'|'LOW'} tier
 * @returns {AssetDescriptor[]}
 */
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

/**
 * Device filter — the itom `filterTexturesByDevice` idiom, re-themed.
 *
 * Touch devices have no hover, so the luminous `_glow` twin of a dark/dormant texture is
 * never needed and must never be fetched (§7.9 touch idiom). Tier-restricted assets and
 * on-demand assets are dropped from preload sets as well.
 *
 * @param {AssetDescriptor[]} assets
 * @param {{ supportsHover?: boolean, tier?: string, includeOnDemand?: boolean }} [options]
 * @returns {AssetDescriptor[]}
 */
export const filterAssetsByDevice = (assets, options = {}) => {
  const { supportsHover = true, tier = 'HIGH', includeOnDemand = false } = options;
  return assets.filter((asset) => {
    if (asset.preload === false && !includeOnDemand) return false;
    if (asset.hoverOnly && !supportsHover) return false;
    if (Array.isArray(asset.tiers) && !asset.tiers.includes(tier)) return false;
    return true;
  });
};

/**
 * Which groups a tier is allowed to PRELOAD.
 *
 * LOW preloads OPENING + READING_CORE only — itom's out-of-memory guard, carried over
 * verbatim in intent (§7.7). EARTH and PATHWAYS still load on LOW, just on demand at the
 * state boundary, so a low-end device breathes a little longer in darkness instead of
 * crashing. Readiness-gated boundaries are the load-hiding mechanism (§2.14).
 *
 * @param {'HIGH'|'MEDIUM'|'LOW'} tier
 * @returns {string[]}
 */
export const groupsForTier = (tier) =>
  tier === 'LOW'
    ? [ASSET_GROUPS.OPENING, ASSET_GROUPS.READING_CORE]
    : [...GROUP_LOAD_ORDER];

/**
 * Resolved, device-filtered URLs for a group.
 *
 * @param {string} group
 * @param {{ tier?: string, supportsHover?: boolean, includeOnDemand?: boolean }} [options]
 * @returns {string[]}
 */
export const urlsForGroup = (group, options = {}) => {
  const tier = options.tier ?? 'HIGH';
  return filterAssetsByDevice(assetsForGroup(group, tier), { ...options, tier }).map((asset) =>
    assetUrl(asset.url),
  );
};

/* -------------------------------------------------------------------------- */
/* Warm-up                                                                     */
/* -------------------------------------------------------------------------- */

/** Assets already warmed this page-load, so a re-entered state never refetches. */
const warmed = new Set();

/**
 * Warm one asset into the HTTP cache. NEVER rejects: a 404 on a decorative texture must
 * not 404-block the readiness pipeline. `fetch` with `no-cors` would hide status codes,
 * so a same-origin `fetch` is used and any failure is swallowed deliberately.
 *
 * @param {string} url
 * @returns {Promise<boolean>} true when the byte stream arrived, false when it did not
 */
const warmOne = async (url) => {
  if (warmed.has(url)) return true;
  warmed.add(url);
  try {
    const response = await fetch(url, { credentials: 'omit', cache: 'force-cache' });
    return response.ok;
  } catch {
    // Non-fatal by contract. The scene degrades; the reader is never told.
    return false;
  }
};

/**
 * Warm a whole group. Resolves when every request has settled, whatever the outcome —
 * `assetsReady(group)` means "we waited", not "every byte arrived", which is what keeps
 * a missing asset from stranding a reader in darkness.
 *
 * @param {string} group
 * @param {{ tier?: string, supportsHover?: boolean }} [options]
 * @returns {Promise<{ group: string, requested: number, arrived: number }>}
 */
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
