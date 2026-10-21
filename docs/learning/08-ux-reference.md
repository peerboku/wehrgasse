# 08 — UX research: learning from Flatastic

## 1. The idea

Before designing screens, study a product that already solves the same problem, ideally one your users have **actually used**. You're not copying its look; you're collecting **evidence**: which flows work, which rules it assumes, and where it doesn't fit *your* situation. Professionals call this a **competitive analysis** or **heuristic review**.

Raw material beats memory: take screenshots of real flows, then annotate them. For each screen, ask:

1. **What is the user's job here?** (e.g. "find out what I have to do")
2. **How many taps** to finish it?
3. **What rule does the app assume?** (who can do what, when things reset)
4. **Where does that rule differ from ours?**

The final judges are your users. That's what the hallway test is for. The analysis only produces better *questions* for it.

## 2. In our app

Peer set up our real 4 chores in Flatastic and took 8 screenshots (21.10.2026, `docs/flatastic/screenshots/`, kept **out of git** because the repo is public and they show flatmates' names and photos).

| Screenshot | Shows |
|---|---|
| IMG_2036 | Empty state with suggestions + chore detail sheet ("In 4 Tagen fällig", Verantwortlich: Manu, "Abhaken") |
| IMG_2037, 2038 | "Aufgabe hinzufügen": weekly, first deadline Sun 25.10., rotation order picked by tapping avatars (Peer → Carla) |
| IMG_2039 | Task list: all 4 chores, due "In 4 Tagen", one avatar each, effort points |
| IMG_2040 | Statistik: ranking by points + "Statistik zurücksetzen" |
| IMG_2043 | Tapping someone else's chore: "Aufgabe für Carla abhaken / Ich übernehme die Aufgabe / Abbrechen" |
| IMG_2044 | Confirmation: "Hat Carla … wirklich bereits erledigt? … Ja klar" |
| IMG_2045 | Pinnwand → Aktivitäten feed |

**Findings, and what they mean for us:**

| # | Observation (evidence) | Flatastic's rule | Ours | Consequence |
|---|---|---|---|---|
| 1 | Rotation is set **per chore** as a list of people (IMG_2037) | each chore rotates on its own | one 4-week table across all chores | Flatastic can't guarantee "everyone has exactly one chore per week". That's the reason for our `rotation_template`. Confirms the decision. |
| 2 | Feed: Peer, Carla, Peer completed "Bad Carla & Peer" within 1 minute (IMG_2045, 11:40–11:41) | ticking **advances the rotation immediately** | assignments are per **calendar week** | A chore can be done "three times" in a week in Flatastic. Our materialized weekly rows prevent this. Confirms the decision. |
| 3 | Anyone can tick a chore *for* someone else, or take it over (IMG_2043) | shared responsibility | only the owner marks done | Real case: Carla cleaned but forgot to tap. **Hallway-test question**, not a change (see ROADMAP Ideas). |
| 4 | Confirmation is short and playful: "Ja klar" (IMG_2044) | | confirmation sheet + celebration | Good tone to borrow for `strings.ts`. |
| 5 | Feed text is **English** in a German UI: "Nice! Peer has completed the chore…" (IMG_2045) | | all text in `strings.ts` | Exactly the inconsistency our single strings file prevents. |
| 6 | Points, ranking, "reset statistics" (IMG_2040) | gamified competition | all chores equal weight, no ranking | Deliberately not built; stats later come from `events`. |
| 7 | 🔒 on "Verlauf" and "Notizen" (IMG_2036, 2037) | paywall | free | One reason we're building our own. |
| 8 | "In 4 Tagen" counts **down to a deadline** (Sunday) (IMG_2039) | deadline-based | week-based + "überfällig seit X Tagen" | Our MyWeek screen can borrow the countdown idea: show how many days are left this week. |

**Missing evidence** (⏳ for you): the README listed 4 screenshot types, and two aren't covered:

- **Overdue display**: how Flatastic shows a chore after its deadline. Only visible after Sunday; take it on Mon 26.10.
- **Push notification** on the lock screen: have a flatmate tick a chore while your phone is locked.

## 3. Predict, then run

Before the hallway test (Phase 2), **predict** for each flatmate: will they find their chore in under 5 seconds? Write the prediction into [docs/hallway-test.md](../hallway-test.md) *before* the test. Afterwards, compare. Your predictions show your blind spots as a designer.

## 4. What a pro would also do

- **Count taps per core task** in both apps and put them in a table. Our core value promises: open → see → tap → confirm. That's 2 taps.
- **Apply Nielsen's 10 usability heuristics** to each screenshot (e.g. "error prevention": Flatastic's "wirklich bereits erledigt?" dialog is an example).
- **Ask the people who used it**: "What annoyed you about Flatastic?" is a better source than any screenshot.

## 5. Sources

- Nielsen Norman Group, 10 usability heuristics: <https://www.nngroup.com/articles/ten-usability-heuristics/>
- Steve Krug, *Don't Make Me Think* and *Rocket Surgery Made Easy* (books)
- Apple Human Interface Guidelines (iPhone patterns like sheets, tab bars): <https://developer.apple.com/design/human-interface-guidelines/>

## 6. How we know it's right

Not by us. The **hallway test** with Carla, Noa and Manu on their own phones decides whether our screens are clear, and after launch the **done-rate in `assignments`** decides whether the rules (like "only the owner can tick") fit how the flat actually lives.

## 7. Check yourself

1. Which Flatastic behaviour would let one person collect points by ticking the same chore repeatedly, and which part of our data model prevents that?
2. Why are the screenshots not in git?
3. Name one thing we *borrow* from Flatastic and one we *deliberately don't*.

<details><summary>Answers</summary>

1. Ticking advances the rotation immediately (finding 2). Our `assignments` table has one row per (week_start, chore) with a unique constraint, and done is just `done_at` on that row.
2. The repo is public, and they contain flatmates' names and photos.
3. Borrow: short playful confirmation ("Ja klar") or the days-left countdown. Don't: points/ranking, per-chore independent rotation.

</details>

## 8. Your notes

> _Which finding surprised you most, and why?_
>
>
