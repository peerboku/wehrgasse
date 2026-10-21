import { strings } from '../lib/strings'
import styles from './TabBar.module.css'

export type Tab = 'myWeek' | 'overview' | 'settings'

const tabs: { id: Tab; icon: string }[] = [
  { id: 'myWeek', icon: '🧽' },
  { id: 'overview', icon: '🏠' },
  { id: 'settings', icon: '⚙️' },
]

type Props = {
  active: Tab
  onChange: (tab: Tab) => void
}

export function TabBar({ active, onChange }: Props) {
  return (
    <nav className={styles.tabBar}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`${styles.tab} ${tab.id === active ? styles.active : ''}`}
          onClick={() => onChange(tab.id)}
          aria-current={tab.id === active ? 'page' : undefined}
        >
          <span className={styles.icon} aria-hidden="true">
            {tab.icon}
          </span>
          {strings.tabs[tab.id]}
        </button>
      ))}
    </nav>
  )
}
