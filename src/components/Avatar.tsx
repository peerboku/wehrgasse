import { useContext } from 'react'
import { PhotosContext } from '../lib/photos'
import type { Member } from '../lib/types'
import styles from './Avatar.module.css'

type Props = {
  member: Member
  size?: number
  tint?: boolean // false when the surrounding element already paints the member colour
}

// The member's photo if they set one in Settings, otherwise their emoji
export function Avatar({ member, size = 40, tint = true }: Props) {
  const photo = useContext(PhotosContext)[member.id]
  return (
    <span
      className={styles.avatar}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.55,
        // --tint-pct is 16 % in light mode, 26 % in dark mode (index.css)
        background: tint ? `color-mix(in srgb, ${member.color} var(--tint-pct), transparent)` : undefined,
      }}
      aria-hidden="true"
    >
      {photo ? <img className={styles.photo} src={photo} alt="" /> : member.emoji}
    </span>
  )
}
