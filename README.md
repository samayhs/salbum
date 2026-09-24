# slog

A blog. Static site built with Astro. One big piece of cloth with rectangular patches stitched onto it — no frame, no nav, no grid. Everything lives on the homepage and links straight to the post.

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

This creates a `dist/` folder. The live site is on Cloudflare Pages at https://salbum.pages.dev — it deploys automatically when you push to `main`. No server, no database.

## How it's organized

There's no browsing layer: no nav bar, no index pages. The homepage is the whole site, and every patch links directly to its post. Tags show up as labels on the patch, not as destinations.

## How to write posts

Posts are plain markdown files. No CMS, no login. Open the file, write, save, commit.

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
tags: ["reissue", "loud"]          # optional, shown as labels
cover: "/covers/your-slug.jpg"     # optional, put the image in public/covers/
coverAlt: "Description of the cover"
featured: false                    # set true for one post at a time
---

Your review in markdown.
```

The `tldr` must be exactly three words — that's the verdict. `featured: true` gives the patch the dark blue cloth.

## Project layout

```
src/
  content/
    reviews/        ← posts (.md)
    config.ts       ← schema; edit if you want new fields
  pages/
    index.astro     ← the cloth: every post, scattered
    reviews/[slug].astro
    about.astro     ← not linked from anywhere, reachable at /about/
  layouts/
    Base.astro      ← masthead + footer, nothing else
  components/
    ReviewCard.astro
    LastFm.astro      ← now playing, owns the top band
    MyRotation.astro  ← last four weeks
  scripts/
    triangleLayout.js ← the skyline packer
  styles/
    global.css      ← all the visual styling lives here
public/
  covers/           ← put cover art images here
```

## Tweaking the look

All colors live as CSS variables at the top of `src/styles/global.css`:

- `--paper` is the wall color everything is pinned to (currently coral)
- `--paper-soft` is the patch cloth
- `--paper-deep` is the ink
- `--dark-1`, `--dark-2`, `--dark-3`, `--living-green`, `--living-blue` are the dark patches
- `--stitch` and `--stitch-bright` are the gold thread

Two things drive the layout:

- `.patch` — a rectangle of cloth with thread running just inside its edge and a shadow so it sits proud of the weave. Add `on-dark` plus `umber` / `wine` / `coffee` / `forest` / `night` for the dark cloths.
- `.fabric` — the stage the jumble plays on. `src/scripts/triangleLayout.js` does the actual packing: patches are dropped one at a time, most important first, onto a skyline, so they interlock at different heights instead of forming rows, inside a shape that tapers as it descends. The homepage script feeds it one box per patch and then positions them absolutely.

Each patch declares itself to the packer with data attributes: `data-importance` (higher sits nearer the top), `data-size` (`xs`–`xl`), and optional `data-aspect`. Posts get theirs from `index.astro` — newest and featured rank highest. Avoid `s`/`xs` for post patches; they clip the cover, tags, title and three chips.

Knobs live in the `layoutTriangle` call in `index.astro` — `taper`, `chaos`, `seed`, `baseHeight`. Change `seed` for a different jumble of the same content.

Below 720px the packer stands down and the patches fall back to a plain responsive grid, because a tapering collage of slivers is unreadable on a phone.

The wedge only reads as a cluster once there are enough posts to fill it. With a handful it will look like a loose cascade and leave bare wall at the edges.

## The admin page

`/admin` writes posts and tunes the layout from the deployed site. It works by
committing to this repo through a Cloudflare Pages Function, which makes Pages
rebuild — so publishing takes a minute or two, and every change is a normal
commit you can revert.

**The page itself is not the security boundary.** It is static HTML like every
other page. What protects you is Cloudflare Access in front of the routes, plus
`functions/api/_access.js`, which verifies the Access JWT on every write and
refuses anything that isn't signed by your team and addressed to your app. Until
you finish the setup below, `/admin` is readable by anyone who guesses the URL —
they just can't publish anything with it, because the API rejects them.

### 1. Cloudflare Access

In the Cloudflare dashboard, under Zero Trust → Access → Applications, add a
self-hosted application:

- Domain `salbum.pages.dev`, path `admin`
- Add a second path for `api` so the endpoints are covered at the edge too
- Policy: Allow, with an `Emails` rule listing your address
- Copy the **Application Audience (AUD) tag** from the app's Overview

### 2. A GitHub token

Create a fine-grained personal access token scoped to **only this repository**,
with **Contents: Read and write**. That is the whole permission it needs — it
cannot touch your other repos or settings.

### 3. Secrets

In Pages → your project → Settings → Environment variables, add these as
**encrypted** secrets for Production:

| Name | Value |
| --- | --- |
| `CF_ACCESS_TEAM_DOMAIN` | `yourteam.cloudflareaccess.com` |
| `CF_ACCESS_AUD` | the AUD tag from step 1 |
| `ADMIN_EMAIL` | your email (comma-separated for more than one) |
| `GITHUB_TOKEN` | the token from step 2 |
| `GITHUB_REPO` | `samayhs/salbum` |
| `GITHUB_BRANCH` | `main` (optional, defaults to main) |

None of these belong in the repo. If a secret ever leaks, revoke the GitHub
token first — that is the one that can write.

### Local development

`npm run dev` serves `/admin`, but the form and the save button will fail: the
API lives in `functions/`, which Astro's dev server doesn't run, and there is no
Access assertion to verify. To exercise the endpoints locally you'd need
`wrangler pages dev` with the variables set. Day to day it's easier to edit
markdown directly.

## To do later

- Real SVG hand-drawn stitch paths instead of CSS dashes (v2 polish)
- Per-tag filtering (tags are labels only right now)
- RSS feed
- Search
