export function StatusTag({ label, tone = 'neutral' }) {
  return (
    <span className="ogp-admin-tag" data-tone={tone}>
      {label}
    </span>
  );
}

export default StatusTag;
