/**
 * The end pathways (S14 Choose Your Path) as data.
 *
 * Successor to itom's `contentData.js` (master §7.3 StudioRoom row). The tower/list
 * presentation is a rendering concern; this module is the structure only.
 *
 * Labels and sub-copy are NOT stored here — they live in `copy.js` and are read from it,
 * so there is exactly one place protected language can be edited (BUILD_CONTRACT §1).
 *
 * Presentation law (§8.10.3): quiet, EQUAL-weight choices. No cards, shadows or
 * prices; no highlighted "recommended" option; no urgency.
 *
 * `support_mission` is retired. It opened the same donation workflow as
 * `donate_digital_transcript`, so keeping both on the list was two names for one page.
 *
 * `return_later` is retired too. Leaving is never punished, but it is also not a
 * destination: the reading position is kept on the device without an account, so closing
 * the tab already does everything that pathway did, and listing it made an exit look like
 * a choice the experience wanted the reader to weigh.
 *
 * Order is configurable (`PATHWAY_ORDER`) because presentation order is a design decision
 * reserved for the Creative Director; the labels are locked and are not.
 */

import { COPY } from '@/config/copy';

/**
 * @typedef {'reading'|'donation'|'purchase'|'identity'|'sharing'} PathwayWorkflow
 * @typedef {Object} Pathway
 * @property {string} slug            canonical slug — also the `PathwaySelected` payload value
 * @property {string} label           LOCKED canonical label (from COPY)
 * @property {string} subCopy         [PROPOSED] one-line description (from COPY)
 * @property {PathwayWorkflow} workflow which §6/§5 flow the selection hands off to
 * @property {string} route           router path the selection resolves to (§7.11 minimal table)
 */

/**
 * Canonical slugs in the order §5 / BUILD_CONTRACT §1 lists them.
 * Reorder this array to reorder the presentation; never reorder by editing definitions.
 */
export const PATHWAY_ORDER = [
  'continue_founders_edition',
  'donate_digital_transcript',
  'purchase_hardcover',
  'become_family',
  'share_opening_arc',
];

/**
 * Structure per slug. `route` uses only the paths in the locked routing table (§7.11):
 * pathway flows are panels *inside* S14, not separate pages — the one continuous
 * application law forbids navigating away — so every in-experience flow resolves to
 * `/pathways` and reading resolves to `/reading-room`.
 */
const PATHWAY_STRUCTURE = {
  continue_founders_edition: { workflow: 'reading', route: '/reading-room' },
  donate_digital_transcript: { workflow: 'donation', route: '/pathways' },
  purchase_hardcover: { workflow: 'purchase', route: '/pathways' },
  become_family: { workflow: 'identity', route: '/pathways' },
  share_opening_arc: { workflow: 'sharing', route: '/pathways' },
};

/**
 * Build the pathway list.
 *
 * @param {string[]} [order] slugs in presentation order; defaults to `PATHWAY_ORDER`
 * @returns {Pathway[]}
 */
export const getPathways = (order = PATHWAY_ORDER) =>
  order
    .filter((slug) => PATHWAY_STRUCTURE[slug] && COPY.PATHWAYS.ITEMS[slug])
    .map((slug) => ({
      slug,
      label: COPY.PATHWAYS.ITEMS[slug].label,
      subCopy: COPY.PATHWAYS.ITEMS[slug].subCopy,
      workflow: PATHWAY_STRUCTURE[slug].workflow,
      route: PATHWAY_STRUCTURE[slug].route,
    }));

/** The listed pathways, in presentation order. */
export const PATHWAYS = Object.freeze(getPathways());

/**
 * @param {string} slug
 * @returns {Pathway|undefined}
 */
export const getPathway = (slug) => PATHWAYS.find((pathway) => pathway.slug === slug);

export default PATHWAYS;
