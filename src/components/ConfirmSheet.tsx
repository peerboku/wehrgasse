import { strings } from '../lib/strings'
import { Button } from './Button'
import styles from './ConfirmSheet.module.css'

type Props = {
  question: string
  hint: string
  yesLabel: string
  onConfirm: () => void
  onCancel: () => void
}

// Bottom sheet that asks "really?" before anything is sent to the others
// ("erledigt?" in Meine Woche, "übernehmen?" in the WG overview).
export function ConfirmSheet({ question, hint, yesLabel, onConfirm, onCancel }: Props) {
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
          {question}
        </h2>
        <p className={styles.hint}>{hint}</p>
        <div className={styles.buttons}>
          <Button onClick={onConfirm}>{yesLabel}</Button>
          <Button variant="secondary" onClick={onCancel}>
            {strings.confirm.cancel}
          </Button>
        </div>
      </div>
    </div>
  )
}
