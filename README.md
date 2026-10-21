# Sphere

Sphere is Kayla’s past-client desk for Archibald Real Estate Group at RE/MAX Crest Realty in Vancouver. It covers the same jobs as the old Morris Marketing and IXACT Contact screens: the people book, keep-in-touch reminders, tasks, the calendar, mass email, letters and labels, activity plans, listings and deals, the vendor list, and reports. The screens are shorter, and the words are plainer.

Everyone in the book is made up. Phone numbers use the 555 range reserved for fiction. Email addresses end in example.com. A quiet **Sample** label stays on every screen so a practice file never gets mistaken for the real book.

## What each part is for

- **Home** shows the numbers that matter today: overdue reminders, birthdays due today, tasks, and live listings.
- **People** is the contact book. Search, jump by letter, sort, and filter by agent or group (Buyer, Moved away, Holiday card, and the rest). Open someone and the profile is split into short cards: household, phones and emails, home and work, birthdays, pets and interests, referrals, notes, files, properties, and history.
- **Keep in Touch** builds reminders for birthdays, a spouse or child’s birthday, wedding anniversaries, move-in dates, purchase anniversaries, and Canadian holidays (including Thanksgiving, Halloween, and the holiday-card week). Overdue items stay visible for two weeks so they can be snoozed or hidden for this year in a batch, instead of piling up forever.
- **Tasks** and **Calendar** hold calls, showings, and office appointments.
- **Mass email** keeps templates and campaigns. Recording a campaign writes it on each person’s history. It does not send a real email. Anyone who opted out, or who has no email, is left out.
- **Letters & labels** previews a letter, a sheet of mailing labels, or an envelope, then prints from the browser.
- **Activity plans** are the drip sequences (a first-time buyer plan, a listing plan, a closing plan). You can put a person on a plan and tick the steps off.
- **Active business** holds listings, buyers, and deals that are still moving.
- **Vendors** is the business directory: inspectors, notaries, stagers, and the rest.
- **Reports** cover the card, phone, and mailing lists, birthdays and anniversaries, the no-mass-email list, where people came from, referrals, outstanding tasks, and a transaction summary. Each report can be printed or downloaded.
- **Import & export** reads a Morris or IXACT style spreadsheet, shows possible duplicates, and lets you skip a row, add the person, or only fill blanks. A practice file is built in.
- **Recycle bin** holds anything you remove, until you put it back or delete it for good.
- **Settings** holds Kayla’s name, the agents, and the group names. It can also put the sample book back if a practice import made a mess.

## Try the practice import

1. Open **Import & export**.
2. Click **Try the practice file**.
3. Nora Ellison and Samir Qureshi are already in the book. The suggested choice is to fill only the blanks (Nora’s school and job, Samir’s home phone).
4. The new names (Lila Okada, Hugo Brennan, and the others) are ready to add. Ruth Abebe is marked as opted out of mass email. One row has no name and is skipped. Calvin Frost’s row comes in with a warning about the birthday.
5. Confirm the import, then open Nora and check that her workplace was filled in.
6. If you want the original sample book back, open **Settings** and choose **Restore sample data**.

The book is kept in the browser you are using, not on the server. Edits on Kayla’s laptop stay on that laptop. A phone, or a browser with its site data cleared, starts again from the 492 sample people. **Settings** can put that sample back in the browser you are in.

## Sign-in

The first screen asks for a password. On Vercel that password is the environment variable `SPHERE_PASSWORD`. It stays on the server. It is not written into the pages.

On your own computer, if you have not set `SPHERE_PASSWORD`, the sign-in word is `preview`. That fallback is only for a local trial. A live site will not open until `SPHERE_PASSWORD` is set.

**Lock the desk** in the top bar signs out of this browser.

## Put it on Vercel

1. Put this project in a public GitHub repository.
2. In Vercel, import that repository. The framework is Next.js. Leave the build command as `next build`.
3. Add one environment variable, for Production and Preview:

   `SPHERE_PASSWORD` — a password only the office should know.

4. Deploy. Open the site, sign in, and you are on the sample book.

No database is required for this version. Nothing is written to the server’s disk.

## If the office later needs one shared book

A database would hold the same things the browser holds now, for one office: people (phones, emails, addresses, birthdays, household, notes, files, properties, history), tasks, calendar items, email templates and campaigns, letters, activity plans and who is on them, listings, buyers, deals, vendors, reminder snoozes, and the office settings (Kayla’s name, agents, groups). The password can stay in `SPHERE_PASSWORD` and does not belong in that database. Until then, two people editing at once will not see each other’s changes.

## Run it on your computer

You need Node.js.

```bash
npm install
npm run dev
```

Then open http://localhost:43123 and sign in.
