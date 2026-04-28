# The Donroe Dossier

A static responsive article archive built from the text files in `articles/`.

## Add or update articles

1. Add a `.txt` file to `articles/`.
2. Put the article title in the filename.
3. Update the metadata map in `tools/build-articles.mjs` if you want custom categories, series, dek copy, or ordering.
4. Regenerate the browser data:

```powershell
npm run prepare:articles
```

The site reads from `assets/articles.js`, which is generated from the source text files.

## Preview locally

Any static file server works. From the project root:

```powershell
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Build for Vercel

```powershell
npm run build
```

This generates `dist/`, which is the Vercel output directory.

Recommended Vercel settings:

- Framework Preset: `Other`
- Build Command: `npm run build`
- Output Directory: `dist`

The repository also includes `vercel.json` with those deployment defaults, clean URLs, and basic security headers.
