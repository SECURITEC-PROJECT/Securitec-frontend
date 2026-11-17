import type { TextBlock } from '../types'
import styles from './Blocks.module.css'

/** Bloc de texte libre : zone de saisie en conception, texte mis en forme en aperçu et à l'impression. */
export function TextBlockView({ block, editing, onChange }: { block: TextBlock; editing: boolean; onChange: (patch: Partial<TextBlock>) => void }) {
  const { style } = block
  const css = {
    fontSize: style.fontSize,
    fontWeight: style.bold ? 700 : 400,
    fontStyle: style.italic ? 'italic' : 'normal',
    textAlign: style.align,
    color: style.color,
    background: style.background,
    border: style.border ? '1px solid #b9bdd0' : 'none',
  } as const

  return editing ? (
    <textarea className={styles.text} style={css} value={block.text} onChange={(event) => onChange({ text: event.target.value })} aria-label="Texte du bloc" />
  ) : (
    <div className={styles.text} style={css}>
      {block.text}
    </div>
  )
}
