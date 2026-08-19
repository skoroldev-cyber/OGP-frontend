/**
 * A state, written as a word.
 *
 * §8.10.4: colour never carries meaning on its own. The tone only tints the tag; the label
 * is always present and is the whole of the information, so the tag reads identically in
 * monochrome, at any contrast setting, and to a screen reader.
 */

/**
 * @param {{ label: string, tone?: 'neutral'|'positive'|'caution'|'negative'|'quiet' }} props
 *        The state and how strongly to tint it.
 * @returns {import('react').ReactElement} The tag.
 */
export function StatusTag({ label, tone = 'neutral' }) {
  return (
    <span className="ogp-admin-tag" data-tone={tone}>
      {label}
    </span>
  );
}

export default StatusTag;
