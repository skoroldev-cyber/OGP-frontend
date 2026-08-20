import { COPY } from '@/config/copy';

export const PATHWAY_ORDER = [
  'continue_founders_edition',
  'donate_digital_transcript',
  'purchase_hardcover',
  'become_family',
  'share_opening_arc',
];

const PATHWAY_STRUCTURE = {
  continue_founders_edition: { workflow: 'reading', route: '/reading-room' },
  donate_digital_transcript: { workflow: 'donation', route: '/pathways' },
  purchase_hardcover: { workflow: 'purchase', route: '/pathways' },
  become_family: { workflow: 'identity', route: '/pathways' },
  share_opening_arc: { workflow: 'sharing', route: '/pathways' },
};

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

export const PATHWAYS = Object.freeze(getPathways());

export const getPathway = (slug) => PATHWAYS.find((pathway) => pathway.slug === slug);

export default PATHWAYS;
