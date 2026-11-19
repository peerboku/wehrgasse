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
    greeting: (name: string) => `Hi ${name}!`,
    openSettings: 'Einstellungen', // aria-label of your avatar top right
    yourChore: 'Diese Woche bist du dran mit',
    yourChoreFromMonday: 'Ab Montag bist du dran mit',
    daysLeft: (days: number) => (days === 1 ? 'Nur noch heute! ⏳' : `noch ${days} Tage`),
    lastDone: (when: string, who: string) => `Zuletzt erledigt ${when} von ${who}`,
    lastDoneByYou: 'dir',
    neverDone: 'Zum ersten Mal dran – du machst den Anfang! 🚀',
    overdueTitle: 'Noch offen',
    fromWeek: (weekStart: string) => `aus der Woche ${weekRange(weekStart)}`,
    doneButton: 'Erledigt',
    // When you have two open chores this week (after taking one over)
    doneButtonFor: (chore: string) => `Erledigt: ${chore}`,
    doneOn: (weekday: string) => `Erledigt am ${weekday}`,
    // Someone did last week's chore on Wednesday or later, so you may skip this week's
    skipOffer: (late: string) => `🐷 ${late} das Drecksschwein hat zu spät geputzt – du kannst diese Woche überspringen!`,
    skipButton: 'Überspringen',
    skipped: 'Übersprungen 😎',
    freeUntilMonday: 'Du hast frei bis Montag. 😎',
    // On your done card until Sunday, not on skipped ones
    undoLink: 'Doch nicht erledigt?',
    doneError: 'Das hat nicht geklappt. Bist du online? Probier es nochmal.',
    crewTitle: 'Die WG diese Woche',
    crewProgress: (done: number, total: number) => `${done} von ${total} erledigt`,
    nextWeek: 'Ab Montag:',
  },

  confirm: {
    question: (chore: string) => `„${chore}“ erledigt?`,
    hint: 'Alle anderen werden benachrichtigt.',
    yes: 'Ja klar!',
    cancel: 'Abbrechen',
    when: 'Wann?',
    whenAria: 'Wann hast du es erledigt?',
  },

  takeOver: {
    question: (chore: string) => `„${chore}“ diese Woche übernehmen?`,
    hint: (name: string) => `Statt ${name}. Alle anderen werden benachrichtigt.`,
    yes: 'Ja, mach ich! 💪',
    // Only Peer sees it (members.can_skip_for_others), e.g. when someone is on holiday
    skipInstead: 'Lieber überspringen',
    error: 'Das hat nicht geklappt. Bist du online? Probier es nochmal.',
  },

  // Skips never send a push (docs/decisions/0017)
  skip: {
    question: (chore: string) => `„${chore}“ diese Woche überspringen?`,
    hint: (late: string) => `Weil ${late} zu spät geputzt hat. Niemand wird benachrichtigt.`,
    // An overdue chore, yours or (for Peer) someone else's
    questionOverdue: (chore: string, weekStart: string) => `„${chore}“ aus der Woche ${weekRange(weekStart)} überspringen?`,
    hintCleaned: (when: string, who: string) => `Ist inzwischen geputzt (zuletzt ${when} von ${who}). Niemand wird benachrichtigt.`,
    hintNotCleaned: (chore: string) => `⚠️ Seitdem hat niemand „${chore}“ geputzt. Niemand wird benachrichtigt.`,
    // Peer skips someone else's chore of this week
    questionFor: (chore: string, name: string) => `„${chore}“ diese Woche für ${name} überspringen?`,
    hintFor: (name: string) => `Dann bleibt es diese Woche liegen, auch für ${name}. Niemand wird benachrichtigt.`,
    yes: 'Ja, überspringen 😎',
    error: 'Das hat nicht geklappt. Bist du online? Probier es nochmal.',
  },

  undo: {
    question: (chore: string) => `„${chore}“ doch nicht erledigt?`,
    hint: 'Dann ist sie wieder offen. Die anderen bekommen keine Nachricht.',
    yes: 'Ja, wieder öffnen',
    error: 'Das hat nicht geklappt. Bist du online? Probier es nochmal.',
  },

  cheers: ['Stark! 💪', 'Die WG dankt dir! ✨', 'Blitzblank! 🧽', 'Legende! 🏆', 'Sauber gemacht! 🫧'],

  overview: {
    title: 'Die WG diese Woche',
    overdueTitle: 'Überfällig',
    you: 'du',
    progress: (done: number, total: number) => `${done}/${total}`,
    progressLabel: 'erledigt',
    takeHint: 'Tippe auf eine offene Aufgabe, um sie zu übernehmen.',
    statusOpen: 'offen',
    statusDone: 'erledigt',
    statusSkipped: 'übersprungen',
    // 'du · offen', 'Carla · erledigt'
    slotStatus: (who: string, status: string) => `${who} · ${status}`,
    takeAria: (chore: string, name: string) => `${chore} von ${name} übernehmen`,
    // Screen-reader text for the red "!" on a wheel slot
    slotOverdue: 'Aus einer früheren Woche noch offen',
    activityTitle: 'Zuletzt erledigt',
    // 'gestern von Carla', 'vor 8 Tagen von dir'
    activityWhen: (when: string, who: string) => `${when} von ${who}`,
    activityByYou: 'dir',
    activityNever: 'noch nie',
    nextTitle: 'Ab Montag',
    nextYou: 'Du',
  },

  settings: {
    title: 'Einstellungen',
    loggedInAs: (name: string) => `Angemeldet als ${name}`,
    photoAdd: 'Foto hinzufügen',
    photoChange: 'Foto ändern',
    photoRemove: 'Foto entfernen',
    photoBusy: 'Einen Moment …',
    photoHint: 'Nur ihr vier seht dein Foto.',
    photoError: 'Das Foto hat nicht geklappt. Bist du online? Probier es nochmal.',
    sectionNotifications: 'Benachrichtigungen',
    sectionApp: 'App',
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
