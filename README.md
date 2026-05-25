# salbum

A music review blog. Static site built with Astro. Hand-stitched zine aesthetic — warm coral room, dark standouts, dashed gold borders, three-word TLDRs instead of scores.

## Setup

You need Node.js 18 or newer. Check with `node --version`. If you don't have it, get it from nodejs.org.

```bash
npm install
npm run dev
```

Then open http://localhost:4321.

## Build for hosting

```bash
npm run build
```

This creates a `dist/` folder. Drag it onto Netlify, Cloudflare Pages, or Vercel — all free for personal sites — and you're live. No server, no database.

## How to write posts

Posts are plain markdown files. No CMS, no login. Open the file, write, save, commit.

### A new review

Create `src/content/reviews/your-slug.md`:

```markdown
---
title: "The headline of your review"
artist: "Artist Name"
album: "Album Title"
label: "Record Label"
year: 2026
pubDate: 2026-06-01
tldr: ["Word", "Word", "Word"]
cover: "/covers/your-slug.jpg"   # optional, put the image in public/covers/
coverAlt: "Description of the cover"   # optional but good
featured: false                    # set true for one review at a time
---

Your review in markdown. Headings, **bold**, *italics*, [links](https://...),
> pull quotes,

and so on.
```

The `tldr` must be exactly three words — that's the verdict.

Set `featured: true` on one review to pin it to the top of the homepage. If multiple are marked featured, the most recent wins.

### A new list

Create `src/content/lists/your-slug.md`:

```markdown
---
title: "10 songs ruining my week (in a good way)"
kicker: "Currently on rotation"
pubDate: 2026-06-01
color: forest    # forest | umber | indigo — picks the list card's background
entries:
  - track: "Track title"
    artist: "Artist"
    note: "Optional context that shows on the detail page."
  - track: "Next track"
    artist: "Next artist"
---

Optional intro paragraph in markdown above the list.
```

Lists can be any length. The homepage shows the first 8 of the most recent one. The detail page shows all of them, with notes.

## Project layout

```
src/
  content/
    reviews/        ← review posts (.md)
    lists/          ← list posts (.md)
    config.ts       ← schema; edit if you want new fields
  pages/
    index.astro     ← homepage
    reviews/        ← /reviews and /reviews/[slug]
    lists/          ← /lists and /lists/[slug]
    about.astro
  layouts/
    Base.astro      ← masthead, nav, footer
  components/
    ReviewCard.astro
    ListCard.astro
  styles/
    global.css      ← all the visual styling lives here
public/
  covers/           ← put cover art images here
```

## Tweaking the look

All colors live as CSS variables at the top of `src/styles/global.css`:

- `--paper` is the wall color (currently coral)
- `--paper-soft` is the card paper
- `--paper-deep` is the ink (also used for text)
- `--dark-1`, `--dark-2`, `--dark-3` are the standout dark blocks (burnt umber, forest, indigo)
- `--stitch` and `--stitch-bright` are the gold thread

Change those and the whole site shifts. The `.stitched`, `.stitched-tight`, and `.stitched-bold` classes give you the dashed-border treatment on anything.

## To do later

- Real SVG hand-drawn stitch paths instead of CSS dashes (v2 polish)
- Tag system and per-tag pages
- RSS feed
- Search
- Essays section if you decide to add it back
