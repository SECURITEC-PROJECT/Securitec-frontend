import { Icon } from '../../../components/ui'
import type { ImageBlock } from '../types'
import styles from './Blocks.module.css'

/** Bloc photo : l'image occupe le cadre, avec une légende facultative en dessous. */
export function ImageBlockView({ block, editing, onPick }: { block: ImageBlock; editing: boolean; onPick: () => void }) {
  if (!block.src) {
    // Un cadre sans photo n'apparaît pas à l'impression.
    return (
      <button type="button" className={styles.photoEmpty} onClick={onPick} disabled={!editing} data-print="hide">
        <Icon name="camera" size={28} />
        {editing && <span>Ajouter une photo</span>}
      </button>
    )
  }
  return (
    <figure className={styles.photo}>
      <img src={block.src} alt={block.caption || 'Photo du compte rendu'} draggable={false} style={{ objectFit: block.fit, border: block.border ? '1px solid #b9bdd0' : 'none' }} />
      {block.caption && <figcaption>{block.caption}</figcaption>}
    </figure>
  )
}
