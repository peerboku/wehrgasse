import { useEffect, useState, type CSSProperties } from 'react'
import { strings } from '../lib/strings'
import styles from './Celebration.module.css'

const CONFETTI = ['🎉', '✨', '🧽', '🫧', '💪', '⭐']
const PIECES = 18
const DURATION_MS = 1600

type Props = {
  onFinished: () => void
}

// Short emoji confetti after marking a chore done. Plays once, then calls onFinished.
export function Celebration({ onFinished }: Props) {
  // useState(() => ...) runs the random part only once, not on every render
  const [cheer] = useState(() => strings.cheers[Math.floor(Math.random() * strings.cheers.length)])
  const [pieces] = useState(() =>
    Array.from({ length: PIECES }, (_, i) => ({
      emoji: CONFETTI[i % CONFETTI.length],
      // custom CSS properties, read by the animation in Celebration.module.css
      style: {
        '--x': `${Math.random() * 100}vw`,
        '--drift': `${(Math.random() - 0.5) * 30}vw`,
        '--delay': `${Math.random() * 0.3}s`,
      } as CSSProperties,
    })),
  )

  useEffect(() => {
    const timer = setTimeout(onFinished, DURATION_MS)
    return () => clearTimeout(timer)
  }, [onFinished])

  return (
    <div className={styles.overlay} aria-live="polite">
      {pieces.map((piece, i) => (
        <span key={i} className={styles.piece} style={piece.style} aria-hidden="true">
          {piece.emoji}
        </span>
      ))}
      <p className={styles.cheer}>{cheer}</p>
    </div>
  )
}
