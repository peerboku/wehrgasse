# Texts to rotate through

All longer texts the app shows: push notifications, popups (sheets), the celebration and the messages on "Meine Woche".
**Current** = what the app shows today. Add your own ideas under **More**, one per line. Later we pick one at random each time (like the celebration already does).

Rules for new texts:
- German, du-Form, short, a bit playful.
- Keep the placeholders exactly as written: `{name}`, `{chore}`, `{old}`, `{days}`, `{late}`. Every variant must use the same placeholders as the current text (you may change the order).
- Push texts: max. ~100 characters, otherwise the iPhone lock screen cuts them off. Start with an emoji so you see at a glance what happened.

Where the texts live in code:
- Push: [supabase/functions/notify-done/index.ts](../supabase/functions/notify-done/index.ts) (runs on Supabase, can't use `strings.ts`)
- Everything else: [src/lib/strings.ts](../src/lib/strings.ts)

---

## 1. Push notifications

### 1.1 Someone marked their chore done
Goes to the other 3. `{name}` = who did it, `{chore}` = the chore.

Current:
- ✅ {name} hat {chore} erledigt

More:
-
-
-

### 1.2 Someone took over a chore
Goes to everyone except the new owner. `{name}` = who took it over, `{chore}` = the chore, `{old}` = whose chore it was.

Current:
- 🔄 {name} übernimmt diese Woche {chore} (statt {old})

More:
-
-
-

### 1.3 Someone cleaned too late: you can skip
Goes only to this week's owner of the chore, when last week's chore is marked done on Wednesday or later. `{late}` = who cleaned too late, `{chore}` = the chore. The other two get 1.1 as usual.
With "Küche & Staubsaugen" this is ~105 characters, right at the lock-screen limit.

Current:
- 🐷 {late} das Drecksschwein hat zu spät geputzt – du kannst diese Woche {chore} überspringen!

More:
-
-
-

### 1.4 Someone skipped their chore
Removed 18.11.: skips send no push anymore ([ADR 0017](decisions/0017-skip-overdue-for-others-silent.md)).

---

## 2. Popups (sheets)

### 2.1 Confirm "done"
Shown after tapping "Erledigt". `{chore}` = the chore.

Question, current:
- „{chore}“ erledigt?

More:
-
-

Hint below, current:
- Alle anderen werden benachrichtigt.

More:
-
-

Button, current:
- Ja klar!

More:
-
-

Date field label (default today, for when you forgot to tap on the day), current:
- Wann?

Screen reader label of the date field, current:
- Wann hast du es erledigt?

### 2.2 Confirm "take over"
Shown after tapping someone else's open chore in the WG overview. `{chore}` = the chore, `{name}` = whose chore it is.

Question, current:
- „{chore}“ diese Woche übernehmen?

More:
-
-

Hint below, current:
- Statt {name}. Alle anderen werden benachrichtigt.

More:
-
-

Button, current:
- Ja, mach ich! 💪

More:
-
-

Second button, only Peer sees it (opens 2.3 c), current:
- Lieber überspringen

### 2.3 Confirm "skip"
Shown after tapping "Überspringen". No push goes out. Three cases (`src/components/SkipSheet.tsx`):

**a) Your chore of this week, someone cleaned too late.** `{chore}` = the chore, `{late}` = who cleaned too late.

Question, current:
- „{chore}“ diese Woche überspringen?

More:
-
-

Hint below, current:
- Weil {late} zu spät geputzt hat. Niemand wird benachrichtigt.

More:
-
-

**b) An overdue chore** (yours on "Meine Woche", anyone's for Peer in the WG overview). `{chore}` = the chore, `{week}` = e.g. "26.10. – 01.11.", `{when}` = e.g. "vor 3 Tagen", `{who}` = who cleaned it last.

Question, current:
- „{chore}“ aus der Woche {week} überspringen?

Hint if it was cleaned in a later week, current:
- Ist inzwischen geputzt (zuletzt {when} von {who}). Niemand wird benachrichtigt.

Hint if nobody has cleaned it since, current:
- ⚠️ Seitdem hat niemand „{chore}“ geputzt. Niemand wird benachrichtigt.

More:
-
-

**c) Peer skips someone else's chore of this week** (e.g. holiday). `{chore}` = the chore, `{name}` = whose chore it is. Opened with the button "Lieber überspringen" in the take-over sheet (2.2).

Question, current:
- „{chore}“ diese Woche für {name} überspringen?

Hint below, current:
- Dann bleibt es diese Woche liegen, auch für {name}. Niemand wird benachrichtigt.

More:
-
-

Button for all three, current:
- Ja, überspringen 😎

More:
-
-

### 2.4 Confirm "undo"
Shown after tapping "Doch nicht erledigt?" on your done card. `{chore}` = the chore. No push goes out.

Question, current:
- „{chore}“ doch nicht erledigt?

More:
-
-

Hint below, current:
- Dann ist sie wieder offen. Die anderen bekommen keine Nachricht.

More:
-
-

Button, current:
- Ja, wieder öffnen

More:
-
-

---

## 3. Celebration after "done"
Big text in the short animation. **Already rotates** (random pick).

Current:
- Stark! 💪
- Die WG dankt dir! ✨
- Blitzblank! 🧽
- Legende! 🏆
- Sauber gemacht! 🫧

More:
-
-
-

---

## 4. "Meine Woche" screen

### 4.1 Greeting
At the top. `{name}` = you.

Current:
- Hi {name}! 👋

More:
-
-
-

### 4.2 Your chore is done, nothing left this week
Current:
- Du hast frei bis Montag. 😎

More:
-
-
-

### 4.3 Nobody has ever done this chore
Instead of "Zuletzt erledigt …".

Current:
- Zum ersten Mal dran – du machst den Anfang! 🚀

More:
-
-

### 4.4 Last day of the week (Sunday)
Current:
- Nur noch heute! ⏳

More:
-
-

### 4.5 Days left (Monday–Saturday)
`{days}` = number of days left (2–7).

Current:
- noch {days} Tage

More:
-
-

### 4.6 You may skip (someone cleaned too late)
In your chore card, above the "Überspringen" button. `{late}` = who cleaned too late.

Current:
- 🐷 {late} das Drecksschwein hat zu spät geputzt – du kannst diese Woche überspringen!

More:
-
-
-

### 4.7 You skipped your chore
Big text in your card instead of "Erledigt am …".

Current:
- Übersprungen 😎

More:
-
-

### 4.8 Undo link on your done card
Small orange pill under "Du hast frei bis Montag. 😎" (not on skipped cards). Keep it short, it has to fit in one line.

Current:
- Doch nicht erledigt?

More:
-
-

---

## 5. Login

### 5.1 Welcome
Current:
- Hallo WG! 🏠

More:
-
-

### 5.2 Wrong password
Current:
- Hmm, das Passwort stimmt nicht.

More:
-
-

---

## 6. Errors
Same text for "done", "take over", "skip" and notifications in Settings. Probably better to keep it plain, but if you want:

Current:
- Das hat nicht geklappt. Bist du online? Probier es nochmal.

More:
-
