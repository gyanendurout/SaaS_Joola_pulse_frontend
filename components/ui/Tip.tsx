export function Tip({ text }: { text: string }) {
  return (
    <span className="tip-wrap">
      <span className="tip-icon">?</span>
      <span className="tip-popup">{text}</span>
    </span>
  )
}
