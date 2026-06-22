# Week Plan — setup guide

A standalone weekly planner. Two one-time setups (~10 min total): **deploy** (GitHub Pages) and **sync** (Supabase). After that you just open the bookmark.

---

## Part 1 — Deploy to GitHub Pages (~5 min)

1. Go to https://github.com and sign in (create a free account if needed).
2. Click **+** (top right) → **New repository**. Name it `weekplan`, leave it **Public**, click **Create repository**.
3. On the new repo page, click **uploading an existing file** (link in the middle of the page).
4. Drag in these 5 files (not the folder, the files themselves):
   `index.html`, `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png`
5. Click **Commit changes**.
6. Go to **Settings** (tab) → **Pages** (left sidebar). Under "Branch", select **main** and **/(root)**, click **Save**.
7. Wait ~1 minute, refresh the page. Your URL appears at the top:
   **`https://YOURNAME.github.io/weekplan/`**

That URL is what you bookmark. Updating the app later = uploading a new `index.html` over the old one.

---

## Part 2 — Set up sync with Supabase (~5 min)

1. Go to https://supabase.com → **Start your project** → sign up (free, no card).
2. Create a **New project** (any name, any region near you, any database password — you won't need it again).
3. When the project is ready, open **SQL Editor** (left sidebar), paste this, click **Run**:

   ```sql
   create table if not exists plans (
     id text primary key,
     data jsonb not null,
     updated_at timestamptz not null default now()
   );
   alter table plans enable row level security;
   create policy "planner anon access" on plans
     for all using (true) with check (true);
   ```

4. Click the gear icon (**Project Settings**, left sidebar). Copy two values:
   - Under **Data API**: the **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - Under **API Keys**: the **publishable key** (`sb_publishable_...`). A legacy **anon** key (long JWT string) works too.
   - Shortcut: the **Connect** button at the top of the dashboard shows both in one dialog.
5. Open your planner URL, tap the **⚙** button:
   - paste the Project URL and anon key
   - leave the auto-generated **plan code** as is
   - click **Save & test** → should show ✅

### Second device (phone)

In ⚙ click **Copy setup link** and send it to yourself (email/WhatsApp). Open it once on the phone — sync settings import automatically. Then add the page to your home screen:

- **iPhone (Safari):** Share button → **Add to Home Screen**
- **Android (Chrome):** ⋮ menu → **Add to Home screen** / **Install app**

It opens full-screen like a native app and works offline (changes sync when back online).

**Privacy note:** the plan lives in your own Supabase project, readable only with your anon key + plan code. The setup link contains both, so only send it to yourself.

---

## Using the app

The grid runs **Monday to Saturday, midnight to midnight** (Sunday is omitted).

- **Place a task:** drag it onto the grid (desktop) — it drops the task's full remaining hours, then drag either edge to trim. On the phone: tap the task, then tap the grid.
- **Move:** drag a block — a shaded outline shows where it will land while you drag. **Resize:** drag its **top or bottom** edge (both work now).
- **Tap a block** to select it → a toolbar appears: change day, move 15 min, extend/shrink the **top** edge, extend/shrink the **end**, delete, done. Easiest method on the phone, and the only practical way to resize 15-min blocks.
- **Edit a task:** tap its name or hours number and type — no edit mode. Tap the colored left stripe for its color, × to delete. Two tasks can't share the same name.

### Commands (text box at the top)

- **Place a known task:** `Growth mon-sat 5–5:30am` · `Mails mon-fri 9-9:30` · `Fruit tue and thu 14:00-15:00`.
- **Add a one-off meeting:** type any name that **isn't** an existing task — `Meet Fred tue 1–2:30pm`. Meetings appear as dashed blocks with no hour budget and don't clutter the task list. (Always include a day.)
- **Days:** `every day` (Mon–Sat), `mon-fri`, `tue and thu`, `weekends` (= Saturday).

### Weeks

- Use **◀ Week n / m ▶** in the header (or the ← → arrow keys) to move between weeks; **+** adds a week, 🗑 deletes the current one. The task **list** is shared across weeks, but each week has its **own hour budget per task** and its own blocks.
- Editing a task's hours number changes the budget **for the week you're viewing**. A newly added week starts from the task's default and you can tune it.
- The summary at the top shows **this week** free/planned, **all weeks** free/planned, and an **"other weeks" pace line**: given the hours you've assigned to the current week, how much work is left per remaining week on average — i.e. `(total planned across all weeks − hours placed this week) ÷ (number of other weeks)`. Hours already placed in future weeks don't reduce it; it's a target pace, not a count of what's done.

### Import per-week budgets from a Google Sheet

Lay the sheet out with **Task** in the first column and **one column per week**:

| Task | Week 1 | Week 2 | Week 3 |
|------|--------|--------|--------|
| Growth | 10 | 6 | 8 |
| Mails | 4 | 4 | 2 |

1. (A single **Hours** column also works if every week is the same. An optional **Color** column is honoured.)
2. **File → Share → Publish to web →** pick the sheet, format **Comma-separated values (.csv)**, copy the link.
3. ⚙ → paste it under "Published CSV link" → **Save & import now**. Afterwards an **⤓ Import from sheet** button sits at the top of the task list — press it any time to pull updates. It sets each week's budget, adds new tasks, and creates extra weeks if your sheet has more columns than you have weeks. It never deletes. A blank cell leaves that week on the task's default.

### Other

- **Over-assigned tasks** turn amber with a ⚠ and an "Xh over" label. **Just-right** tasks show a calm ✓ and fade to the bottom.
- **Overlaps** show side-by-side with the shared time highlighted yellow.
- **Auto-merge:** two blocks of the **same task** on the same day that touch or overlap automatically combine into one.
- **Sticky note:** the 🗒 button (top bar) shows/hides a pale-yellow note. **Move** it by dragging its frame (the border around the text); **resize** from **any of the four corners**. While typing: **Ctrl+B** bold, **Ctrl+I** italic, **Ctrl+H** dark-pink text, **Ctrl+Shift+8** bullet list (**Tab** / **Shift+Tab** to nest). It's one shared note, saved and synced like the rest of your plan.
- **Undo:** ↺ or Ctrl/Cmd-Z. **Sync dot:** green = synced, yellow = saving, red = problem (tap for details), grey = not set up.
- **Export / Import / Clear week** live in ⚙.
