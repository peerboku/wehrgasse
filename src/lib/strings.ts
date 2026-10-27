// All German UI text lives here, so wording can be changed in one place.
import { addDays } from './week'

const weekdaysShort = ['Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.', 'So.']
const monthsShort = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.']

function dayAndMonth(date: string) {
  const [, month, day] = date.split('-').map(Number)
  return { day, month: monthsShort[month - 1] }
}

// '2026-10-19' -> '19.–25. Okt.', across months: '26. Okt. – 1. Nov.'
function weekRange(weekStart: string) {
  const start = dayAndMonth(weekStart)
  const end = dayAndMonth(addDays(weekStart, 6))
  return start.month === end.month
    ? `${start.day}.–${end.day}. ${end.month}`
    : `${start.day}. ${start.month} – ${end.day}. ${end.month}`
}

export const strings = {
  appName: 'WG-App',

  // weekdayIndex: 0 = Monday … 6 = Sunday
  weekday: (weekdayIndex: number) => weekdaysShort[weekdayIndex],

  weekRange,

  // '2026-10-26' -> 'fällig bis Sonntag, 1. Nov.'
  deadline: (weekStart: string) => {
    const end = dayAndMonth(addDays(weekStart, 6))
    return `fällig bis Sonntag, ${end.day}. ${end.month}`
  },

  overdueSince: (days: number) => (days === 1 ? 'überfällig seit gestern' : `überfällig seit ${days} Tagen`),

  // 0 -> 'heute', 1 -> 'gestern', 8 -> 'vor 8 Tagen'
  daysAgo: (days: number) => (days === 0 ? 'heute' : days === 1 ? 'gestern' : `vor ${days} Tagen`),

  app: {
    loading: 'Lädt …',
    loadError: 'Die Daten konnten nicht geladen werden. Bist du online?',
    retry: 'Nochmal versuchen',
  },

  login: {
    welcome: 'Hallo WG! 🏠',
    passwordLabel: 'WG-Passwort',
    passwordPlaceholder: 'Passwort',
    submit: "Los geht's",
    errorEmpty: 'Da fehlt noch das Passwort.',
    errorWrong: 'Hmm, das Passwort stimmt nicht.',
    errorOffline: 'Keine Verbindung. Probier es gleich nochmal.',
    pickTitle: 'Wer bist du?',
    pickSubtitle: 'Tipp auf deinen Namen.',
  },

  tabs: {
    myWeek: 'Meine Woche',
    overview: 'WG',
    settings: 'Einstellungen',
  },

  myWeek: {
    greeting: (name: string) => `Hi ${name}! 👋`,
    yourChore: 'Diese Woche bist du dran mit',
    yourChoreFromMonday: 'Ab Montag bist du dran mit',
    daysLeft: (days: number) => (days === 1 ? 'Nur noch heute! ⏳' : `noch ${days} Tage`),
    lastDone: (when: string, who: string) => `Zuletzt erledigt ${when} von ${who}`,
    lastDoneByYou: 'dir',
    neverDone: 'Zum ersten Mal dran – du machst den Anfang! 🚀',
    overdueTitle: 'Noch offen',
    fromWeek: (weekStart: string) => `aus der Woche ${weekRange(weekStart)}`,
    doneButton: 'Erledigt',
    doneOn: (weekday: string) => `Erledigt am ${weekday} ✅`,
    freeUntilMonday: 'Du hast frei bis Montag. 😎',
    doneError: 'Das hat nicht geklappt. Bist du online? Probier es nochmal.',
  },

  confirm: {
    question: (chore: string) => `„${chore}“ erledigt?`,
    hint: 'Alle anderen werden benachrichtigt.',
    yes: 'Ja klar!',
    cancel: 'Abbrechen',
  },

  cheers: ['Stark! 💪', 'Die WG dankt dir! ✨', 'Blitzblank! 🧽', 'Legende! 🏆', 'Sauber gemacht! 🫧'],

  overview: {
    title: 'Die WG diese Woche',
    overdueTitle: 'Überfällig',
    you: 'du',
    open: 'offen',
    doneOn: (weekday: string) => `erledigt ${weekday}`,
    lastDone: (when: string) => `zuletzt ${when}`,
  },

  settings: {
    title: 'Einstellungen',
    loggedInAs: (name: string) => `Angemeldet als ${name}`,
    photoAdd: 'Foto hinzufügen 📸',
    photoChange: 'Foto ändern',
    photoRemove: 'Foto entfernen',
    photoBusy: 'Einen Moment …',
    photoHint: 'Nur ihr vier seht dein Foto. 🔒',
    photoError: 'Das Foto hat nicht geklappt. Bist du online? Probier es nochmal.',
    notificationsTitle: 'Benachrichtigungen',
    notificationsToggle: 'Benachrichtigungen aktivieren',
    notificationsHint: 'Du bekommst eine Nachricht, wenn jemand seine Aufgabe erledigt hat.',
    notificationsNeedInstall: 'Klappt nur, wenn die App auf deinem Home-Bildschirm liegt.',
    notificationsDenied:
      'Du hast Benachrichtigungen blockiert. Erlaube sie in den iPhone-Einstellungen unter „Mitteilungen“ → „WG“.',
    notificationsError: 'Das hat nicht geklappt. Bist du online? Probier es nochmal.',
    installTitle: 'App auf den Home-Bildschirm',
    installSteps: [
      'Öffne diese Seite in Safari.',
      'Tippe auf Teilen (□↑), eventuell versteckt unter „⋯“.',
      'Wähle „Zum Home-Bildschirm“ und tippe auf „Hinzufügen“.',
      'Öffne die App ab jetzt über das neue Icon.',
    ],
    logout: 'Abmelden',
  },
}
