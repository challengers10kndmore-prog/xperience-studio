/**
 * Button label with a 3D letter-roll on hover / focus: each letter is a tiny box whose top face is the label
 * and whose bottom face is the same letter in the brand gradient; on hover the boxes flip one after another.
 * Pure CSS (transform only). The accessible name is the plain text.
 */
export function RollText({ children }: { children: string }) {
  return (
    <span className="roll" aria-label={children}>
      {[...children].map((c, i) => (
        <span key={i} aria-hidden className="roll-c" data-c={c === " " ? " " : c} style={{ ["--i" as string]: i }}>{c === " " ? " " : c}</span>
      ))}
    </span>
  );
}
