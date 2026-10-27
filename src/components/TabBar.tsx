import type { ComponentType } from 'react'
import { strings } from '../lib/strings'
import { CheckCircleIcon, HouseIcon, SlidersIcon } from './Icons'
import styles from './TabBar.module.css'

export type Tab = 'myWeek' | 'overview' | 'settings'

const tabs: { id: Tab; Icon: ComponentType<{ className?: string }> }[] = [
  { id: 'myWeek', Icon: CheckCircleIcon },
  { id: 'overview', Icon: HouseIcon },
  { id: 'settings', Icon: SlidersIcon },
]

type Props = {
  active: Tab
  onChange: (tab: Tab) => void
}

export function TabBar({ active, onChange }: Props) {
  return (
    <nav className={styles.tabBar}>
      {tabs.map(({ id, Icon }) => (
        <button
          key={id}
          className={`${styles.tab} ${id === active ? styles.active : ''}`}
          onClick={() => onChange(id)}
          aria-current={id === active ? 'page' : undefined}
        >
          <Icon className={styles.icon} />
          {strings.tabs[id]}
        </button>
      ))}
    </nav>
  )
}
