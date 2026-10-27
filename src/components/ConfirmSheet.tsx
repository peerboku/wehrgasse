import { strings } from '../lib/strings'
import { Button } from './Button'
import styles from './ConfirmSheet.module.css'

type Props = {
  icon?: string // chore emoji, shown in a tile above the question
  question: string
  hint: string
  yesLabel: string
  yesVariant?: 'primary' | 'done' // green "Ja klar!" for done, orange for taking over
  onConfirm: () => void
  onCancel: () => void
}

// Bottom sheet that asks "really?" before anything is sent to the others
// ("erledigt?" in Meine Woche, "übernehmen?" in the WG overview).
export function ConfirmSheet({ icon, question, hint, yesLabel, yesVariant = 'primary', onConfirm, onCancel }: Props) {
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
        {icon && (
          <div className={styles.icon} aria-hidden="true">
            {icon}
          </div>
        )}
        <h2 id="confirm-title" className={styles.question}>
          {question}
        </h2>
        <p className={styles.hint}>{hint}</p>
        <div className={styles.buttons}>
          <Button variant={yesVariant} onClick={onConfirm}>
            {yesLabel}
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            {strings.confirm.cancel}
          </Button>
        </div>
      </div>
    </div>
  )
}
