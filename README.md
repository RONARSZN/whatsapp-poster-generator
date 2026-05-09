# WhatsApp Poster Generator

Vercel serverless poster request engine for WhatsApp-triggered promo posters.

## Purpose

This project turns a short WhatsApp request into a generated poster reply. It parses the command, loads a brand manifest, generates short copy with Gemini, renders a Google Slides poster, exports the PNG to Drive and sends it back through WhatsApp Cloud API.

## Current Build

- Vercel serverless webhook at `/api/webhook.js`
- Node.js parser and poster pipeline in `/lib`
- Google Drive and Slides integration through `googleapis`
- Gemini copy generation with manifest fallback copy
- Google Apps Script source retained as migration reference
- Local asset folder workflow
- One `manifest.json` per brand or campaign root
- Vercel brand manifests in `/brands`
- Brand category folders for AYO, PROSHOP, WAKEPARK and HOMIES MESSHALL
- Command parser
- Asset validation
- Google Slides poster renderer
- Canva and local text replies for parser-compatible workflow modes
- WhatsApp Cloud API wrapper
- PowerShell local checks
- User manual in `docs/user-manual.md`

## Local Check

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tests\run-local-checks.ps1
```

This checks the Homies example asset folders, validates referenced files, verifies the Vercel brand manifests and builds sample poster data without calling live APIs or WhatsApp.

## Poster Production Modes

- `template`: default production mode. Generates a Google Slides poster, exports PNG to Drive and sends the image through WhatsApp.
- `canva`: returns a manual Canva poster brief by WhatsApp text. It does not create or export a Canva design.
- `local`: returns a validation-style WhatsApp text reply without generating an image.

In the Vercel webhook, `template` commands run through the image generation pipeline and return a Drive-hosted PNG to WhatsApp. `canva` and `local` commands return WhatsApp text replies.

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

This build does not require OpenAI, Ideogram, Replicate, Canva Enterprise or any paid image-generation API.

## Vercel Webhook

Register this URL in Meta:

```text
https://whatsapp-poster-generator.vercel.app/api/webhook
```

Runtime: Vercel Node.js `24.x`.

Required Vercel environment variables:

```text
GOOGLE_SERVICE_ACCOUNT_JSON
GOOGLE_DRIVE_FOLDER_ID
WHATSAPP_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_VERIFY_TOKEN
```

Optional Vercel environment variables:

```text
GEMINI_API_KEY
APPROVED_WHATSAPP_SENDERS
```

`GEMINI_API_KEY` improves poster copy. If it is missing or fails, manifest fallback copy is used. `APPROVED_WHATSAPP_SENDERS` is a comma-separated phone allowlist. Leave it blank only for testing.

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
