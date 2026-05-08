# WhatsApp Poster Generator

Local-first poster request engine for WhatsApp-triggered promo posters.

## Purpose

This project turns a short WhatsApp request into a simple no-AI poster reply. It validates brand asset folders, renders a prototype poster with Google Slides, saves the PNG to Drive and sends it back through WhatsApp.

## Current Build

- Google Apps Script backend scaffold
- Local asset folder workflow
- One `manifest.json` per brand or campaign root
- Brand category folders for AYO, PROSHOP, WAKEPARK and HOMIES MESSHALL
- Command parser
- Asset validation
- No-AI template poster renderer
- Canva poster brief builder for editable poster production
- WhatsApp Cloud API wrapper
- PowerShell local checks
- User manual in `docs/user-manual.md`

## Local Check

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tests\run-local-checks.ps1
```

This checks the Homies example asset folders, validates referenced files and builds sample poster data without calling paid generation APIs or WhatsApp.

## Poster Production Modes

- `template`: default zero-cost prototype mode. Creates a simple no-AI poster image through Google Slides, saves it to Drive and sends it through WhatsApp.
- `canva`: prepares a structured brief and asset map only. It does not auto-create or export designs.
- `local`: validates assets and builds the poster brief only.

Default command:

```text
poster wakepark day pass promo portrait
```

Explicit mode override:

```text
poster wakepark day pass promo portrait mode=template
poster wakepark day pass promo portrait mode=canva
poster wakepark day pass promo portrait mode=local
```

Optional inspiration notes:

```text
poster wakepark day pass promo portrait peg="bold sports layout with energetic color"
```

Peg notes are used as creative direction only. Brand assets and the manifest stay the source of truth.

## Setup

1. Put real secrets in `.env` or Google Apps Script Properties, never in committed files.
2. Use `.env.example` as the safe template for required environment variables.
3. Keep generated posters in `output/`; generated files are ignored by Git.
4. Use `templates/asset-folder-example` for safe example structure.
5. Put private or large local asset experiments in `assets-local/` or `private-assets/`; both are ignored.

## Run Locally

Validate the current folder structure:

```powershell
powershell -ExecutionPolicy Bypass -File .\tests\run-local-checks.ps1
```

This prototype does not require OpenAI, Ideogram, Replicate, Canva Enterprise or any paid image-generation API.

## GitHub Sync Workflow

Target workflow:

```text
Desktop VS Code -> commit and push to GitHub -> continue in Codex Web on phone -> create or review changes -> pull changes back on desktop
```

Desktop commands:

```powershell
git init
git add .
git status
git commit -m "Initial safe project setup"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/whatsapp-poster-generator.git
git push -u origin main
```

Phone workflow:

1. Open the GitHub repo in Codex Web.
2. Ask Codex Web to make a small change.
3. Review the diff before committing.
4. Commit and push from Codex Web.

Back on desktop:

```powershell
git pull
```

Safety rule: before every push, run `git status` and make sure `.env`, real API keys, tokens, generated posters and private assets are not staged.
