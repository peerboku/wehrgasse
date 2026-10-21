import { strings } from '../lib/strings'
import { Button } from './Button'
import styles from './ConfirmSheet.module.css'

type Props = {
  choreName: string
  onConfirm: () => void
  onCancel: () => void
}

// Bottom sheet that asks "really done?" before anything is sent to the others.
export function ConfirmSheet({ choreName, onConfirm, onCancel }: Props) {
  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        // taps inside the sheet must not close it
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-title" className={styles.question}>
          {strings.confirm.question(choreName)}
        </h2>
        <p className={styles.hint}>{strings.confirm.hint}</p>
        <div className={styles.buttons}>
          <Button onClick={onConfirm}>{strings.confirm.yes}</Button>
          <Button variant="secondary" onClick={onCancel}>
            {strings.confirm.cancel}
          </Button>
        </div>
      </div>
    </div>
  )
}
