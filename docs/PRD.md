# WhatsApp Poster Generator PRD

## Product Summary

Vercel webhook that turns a WhatsApp poster command into a Google Slides-rendered PNG, saves it to Drive and replies with the image in WhatsApp. Gemini generates short copy when available. Manifest fallback copy is used when Gemini is missing or fails.

## Problem Statement

Homies needs a fast, repeatable way to request promo posters for multiple brand lines without manually rebuilding copy, layout, export and WhatsApp delivery each time.

## Target Users

A. Internal marketing operators.

B. Brand or venue staff sending WhatsApp commands.

C. Codex or developer operators maintaining manifests, assets and deployment.

## Supported Brands

A. `wakepark`

B. `proshop`

C. `ayo`

D. `messhall`

Each brand needs `brands/{brand}/manifest.json`.

## Core WhatsApp Flow

1. User sends:

```text
poster wakepark day pass promo portrait
```

2. Meta sends the event to `/api/webhook.js`.

3. Webhook parses the first text message.

4. Invalid syntax returns `WP-001`.

5. Valid syntax gets an acknowledgment.

6. Pipeline loads the matching manifest, applies defaults, generates copy, creates a one-slide Google Slides poster, exports PNG, saves it to Drive and returns a public image URL.

7. WhatsApp sends the image reply.

8. If image send fails, WhatsApp replies with the poster URL and `WP-201`.

## Commands And Modes

Basic:

```text
poster wakepark day pass promo portrait
```

Key-value:

```text
poster product=wakepark offer="day pass promo" size=portrait cta="Ride with us"
```

Supported modes:

A. `template` - Default. Runs the current Google Slides poster pipeline.

B. `canva` - Returns a WhatsApp text brief for manual Canva production. This repo does not auto-create or export Canva designs.

C. `local` - Returns a WhatsApp text validation reply without generating an image.

Aliases:

A. `poster` -> `template`

B. `test` -> `local`

Creative direction:

```text
poster wakepark day pass promo portrait peg="bold sports layout"
```

`peg=`, `pegNotes=` and `inspo=` guide copy and creative direction. They do not replace the manifest.

## Functional Requirements

A. Webhook must support Meta `GET` verification with `WHATSAPP_VERIFY_TOKEN`.

B. Webhook must accept `POST` WhatsApp events, ignore non-text messages and return `EVENT_RECEIVED`.

C. Webhook must block senders that are not listed in `APPROVED_WHATSAPP_SENDERS` when that optional allowlist is configured.

D. Parser must accept positional and key-value commands starting with `poster`.

E. Parser must support `product`, `offer`, `size`, `cta`, `style`, `mode`, `peg`, `pegNotes` and `inspo`.

F. Parser must normalize sizes: `square` -> `1024x1024`, `landscape` -> `1536x1024`, default or `portrait` or `story` -> `1024x1536`.

G. Manifest loading must match by `product` or `aliases`, including longest alias prefix.

H. Manifest defaults must fill missing CTA and fallback copy.

I. Gemini copy must request raw JSON with `headline`, `tagline` and `cta`, keep copy short and avoid unsupported claims, prices, dates or celebrity names.

J. Gemini must fall back to manifest copy when `GEMINI_API_KEY` is missing or generation fails.

K. Google Slides rendering must create one slide with headline, tagline, CTA and brand text using manifest colors where available.

L. Drive export must save a PNG to `GOOGLE_DRIVE_FOLDER_ID`, make it public and return a Drive image URL.

M. WhatsApp must send text and image replies through Meta Cloud API.

N. If poster generation fails, reply with `WP-101`.

O. If image sending fails after a poster URL exists, reply with `WP-201` and include the URL.

## Error Codes

A. `WP-001` - Invalid command syntax. Pipeline does not run.

B. `WP-101` - Poster generation failed after a valid command.

C. `WP-201` - WhatsApp image send failed. Fallback reply includes the poster URL.

## Required Env Vars

```text
GOOGLE_SERVICE_ACCOUNT_JSON
GOOGLE_DRIVE_FOLDER_ID
WHATSAPP_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_VERIFY_TOKEN
```

Optional:

```text
GEMINI_API_KEY
APPROVED_WHATSAPP_SENDERS
```

Do not commit `.env`, API keys, tokens, generated posters or private assets. `GOOGLE_SERVICE_ACCOUNT_JSON` must be pasted as a single-line value in Vercel. `APPROVED_WHATSAPP_SENDERS` should be a comma-separated list of approved WhatsApp sender numbers when the bot is not in open testing.

## Assets And Manifests

A. Brand manifests live in `/brands`.

B. Private or large local assets stay in ignored folders such as `assets-local/` or `private-assets/`.

C. Generated posters stay in `output/`.

D. Manifests may define `product`, `aliases`, `brand`, `handle`, `categoryFolders`, `assets`, `colors`, `typography`, `brand_voice`, `styleNotes`, `promo_types`, `defaultSize`, `defaultCta` and `fallback_copy`.

E. The PowerShell local check validates referenced files in `templates/asset-folder-example`. The Vercel runtime uses committed `/brands` manifests and does not require private source assets to be committed.

## MVP Scope

Included: Vercel webhook, Meta verification, optional sender allowlist, text-message handling, command parser, four brand manifests, Gemini copy with fallback, Google Slides rendering, PNG export, Drive upload, WhatsApp acknowledgment, image reply, URL fallback, Canva text brief mode and local text validation mode.

Out of scope: Canva design creation or export, paid AI image generation, multi-slide campaigns, dashboard, conversation state, approval workflow and analytics.

## Future Enhancements

A. Real Canva design creation if account and API support are available.

B. Better brand-specific layouts.

C. Asset selection by promo type.

D. Stronger manifest validation in CI.

E. Optional approval previews and poster history.

## Build Notes For Codex

A. Use `README.md` and `docs/user-manual.md` as source of truth.

B. Keep behavior aligned with `api/webhook.js`, `lib/parser.js`, `lib/poster.js`, `lib/gemini.js`, `lib/google.js`, `lib/whatsapp.js` and `brands/*/manifest.json`.

C. Verify with:

```powershell
powershell -ExecutionPolicy Bypass -File .\tests\run-local-checks.ps1
```

D. Do not invent unsupported production features. Say when a feature is image-producing, brief-only, validation-only or parser-compatible only.
