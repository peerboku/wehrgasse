import { useContext } from 'react'
import { PhotosContext } from '../lib/photos'
import type { Member } from '../lib/types'
import styles from './Avatar.module.css'

type Props = {
  member: Member
  size?: number
}

// The member's photo if they set one in Settings, otherwise their emoji
export function Avatar({ member, size = 40 }: Props) {
  const photo = useContext(PhotosContext)[member.id]
  return (
    <span
      className={styles.avatar}
      // 33 at the end of the hex colour = 20 % opacity
      style={{ width: size, height: size, fontSize: size * 0.55, background: `${member.color}33` }}
      aria-hidden="true"
    >
      {photo ? <img className={styles.photo} src={photo} alt="" /> : member.emoji}
    </span>
  )
}
