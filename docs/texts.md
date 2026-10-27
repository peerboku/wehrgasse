# Texts to rotate through

All longer texts the app shows: push notifications, popups (sheets), the celebration and the messages on "Meine Woche".
**Current** = what the app shows today. Add your own ideas under **More**, one per line. Later we pick one at random each time (like the celebration already does).

Rules for new texts:
- German, du-Form, short, a bit playful.
- Keep the placeholders exactly as written: `{name}`, `{chore}`, `{old}`, `{days}`. Every variant must use the same placeholders as the current text (you may change the order).
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
Same text for "done", "take over" and notifications in Settings. Probably better to keep it plain, but if you want:

Current:
- Das hat nicht geklappt. Bist du online? Probier es nochmal.

More:
-
