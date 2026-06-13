# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Single-page static site for [skultix.sh](https://skultix.sh), served via GitHub Pages from the `main` branch. No package.json, no dependencies, no framework — just `index.html`, `config.json`, `pfp.png`, and a tiny Node build script.

## Build & deploy

Build locally (writes `_site/`):
```
node .github/scripts/build.mjs
```

Preview locally — run the build, then open `_site/index.html`. The source `index.html` on its own renders an empty terminal section; the content is only baked in at build time.

Deployment is fully automated: pushing to `main` triggers `.github/workflows/deploy.yml`, which runs the build script and publishes `_site/` to GitHub Pages. There is no test suite or linter configured.

A second workflow, `refresh-pfp.yml`, runs weekly (Sun 06:17 UTC), pulls the latest GitHub avatar for the repo owner into `pfp.png`, and commits + re-triggers the deploy if it changed.

## Architecture — fully static, built from `config.json`

`index.html` is a **template** — it ships with placeholder title/meta tags and an empty `<section id="terminal"></section>`. There is no runtime JS; nothing is fetched at page load.

`.github/scripts/build.mjs` is the only renderer. It reads `config.json`, generates the terminal markup (whoami → name/bio, links → list of links), and patches `index.html` in three places before writing to `_site/`:

1. `<title>` / `og:*` / `twitter:*` meta tags — so link-preview crawlers see the right name and bio.
2. The `--key-width` CSS variable in `:root` — sized from the longest `link.key` so the rendered columns align.
3. The contents of `<section id="terminal">` — the full rendered terminal HTML.

The script throws if any regex doesn't match, which is the safety net: if you rename a meta tag, change the section id, or remove the `--key-width` declaration in `index.html`, the build fails loudly rather than silently shipping a broken page.

The `prompt` field in `config.json` (e.g. `marley@skultix`) doubles as the source for the `(handle)` suffix in the patched title — `build.mjs` splits on `@` and uses the host part.

Note: `config.json` is **not** copied to `_site/` — the published site has no use for it.

## Content edits

Most content changes are just `config.json` edits (name, bio, prompt, links). Link `icon` values are [Nerd Font](https://www.nerdfonts.com/) class names (e.g. `nf-fa-github`); the stylesheet is loaded from `nerdfonts.com` at runtime.

`CNAME` pins the custom domain (`skultix.sh`) for GitHub Pages — don't remove it.
