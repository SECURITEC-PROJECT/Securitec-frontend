import { Card } from '../../../../components/ui'
import { FEATURES } from '../../constants'
import styles from './FeatureList.module.css'

export function FeatureList() {
  return (
    <Card>
      <ul className={styles.list}>
        {FEATURES.map((feature) => (
          <li key={feature} className={styles.item} dangerouslySetInnerHTML={{ __html: feature }} />
        ))}
      </ul>
    </Card>
  )
}
