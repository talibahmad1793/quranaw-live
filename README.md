# QuranAnyWhere (static, GitHub-backed)

The simplest possible version: no database, no login, no build step. You
push PDF files into folders in a GitHub repo, and this site reads that
repo live (via the GitHub API) to show what's there. Add a new part or a
whole new book by just uploading files to GitHub — the site updates
itself, nothing to redeploy.

## How it works

- Each **top-level folder** in your repo = a **book** (e.g. `quran-roman-urdu-hindi`, later `sahih-bukhari`)
- Each **PDF file** inside that folder = a **part** (Juz, volume, etc.), shown in filename order
- The site calls the public GitHub API to list folders/files, and links
  straight to the raw PDF on GitHub for viewing/downloading

This folder already includes `quran-roman-urdu-hindi/` with all 30 parts
(`Part_01.pdf` … `Part_30.pdf`), ready to push.

## 1. Create the GitHub repo

1. On GitHub, click **New repository**. Make it **public** (the site
   reads it without any login, so it needs to be public — or see the
   note on private repos below).
2. Name it anything, e.g. `quran-anywhere-content`.
3. Don't initialize with a README (we already have files to push).

## 2. Push these files

From this folder:

```bash
git init
git add .
git commit -m "Initial site + Quran parts"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

(If `git push` asks for a password, GitHub now requires a [personal
access token](https://github.com/settings/tokens) instead of your
account password — paste the token when prompted.)

> The Quran folder is ~130MB total. A normal `git push` handles this
> fine (GitHub's limit is 100MB *per file*; each part here is a few MB).

## 3. Point the site at your repo

Edit `config.js`:

```js
window.SITE_CONFIG = {
  githubOwner: "YOUR-USERNAME",
  githubRepo: "YOUR-REPO",
  githubBranch: "main",
  siteTitle: "QuranAnyWhere",
  tagline: "Read the Qur'an, part by part, anywhere.",
};
```

Commit and push that change too.

## 4. Turn on GitHub Pages (free hosting)

1. In your repo: **Settings → Pages**.
2. Under "Build and deployment", set **Source: Deploy from a branch**,
   branch **main**, folder **/ (root)**. Save.
3. GitHub gives you a URL like `https://YOUR-USERNAME.github.io/YOUR-REPO/`
   — that's your live site, usually ready within a minute or two.

## Adding more books later (e.g. Hadith)

No code changes, ever:

1. Create a new folder in the repo, e.g. `sahih-bukhari/`.
2. Upload PDF files into it (name them so they sort correctly, e.g.
   `Volume-01.pdf`, `Volume-02.pdf`…) — either by dragging files into
   that folder on github.com, or via `git add` / `git push`.
3. Refresh the site — the new book appears on the home page automatically.

## Limits worth knowing

- **Rate limit**: the GitHub API allows 60 unauthenticated requests/hour
  per visitor IP. Fine for personal/small-scale use; if you outgrow it,
  the earlier Supabase-based version (with a real database) doesn't have
  this limit.
- **Private repos**: if your repo is private, the public GitHub API calls
  in `app.js` won't be able to read it (no login is built into this
  version). Keep the content repo public, or ask me to add a token-based
  private mode.
- **Viewing PDFs**: pages open in an embedded `<iframe>` using the
  browser's built-in PDF viewer. This works in Chrome, Edge, and Firefox;
  a few mobile browsers will instead prompt a download.

## Files

```
index.html    — page shell
style.css     — design tokens + layout (same look as the earlier version)
app.js        — all logic: GitHub API calls, routing, rendering
config.js     — the only file you need to edit (your repo owner/name)
quran-roman-urdu-hindi/
  Part_01.pdf … Part_30.pdf
```
