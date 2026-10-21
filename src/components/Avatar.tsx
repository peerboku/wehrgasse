import type { Member } from '../lib/types'
import styles from './Avatar.module.css'

type Props = {
  member: Member
  size?: number
}

export function Avatar({ member, size = 40 }: Props) {
  return (
    <span
      className={styles.avatar}
      // 33 at the end of the hex colour = 20 % opacity
      style={{ width: size, height: size, fontSize: size * 0.55, background: `${member.color}33` }}
      aria-hidden="true"
    >
      {member.emoji}
    </span>
  )
}
