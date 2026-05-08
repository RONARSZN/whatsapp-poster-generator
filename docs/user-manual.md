# WhatsApp Poster Generator User Manual

## What It Does

You send a poster command. The system finds the matching asset folder, reads its `manifest.json`, builds a poster prompt, generates a poster and sends it back through WhatsApp after live integrations are connected.

## Basic Command

```text
poster wakepark day pass promo portrait
```

You can also use:

```text
poster product=wakepark offer="day pass promo" size=portrait cta="Ride with us"
```

## Production Mode

Canva is the default production mode:

```text
poster wakepark day pass promo portrait
```

Use an explicit mode only when you want to override the default:

```text
poster wakepark day pass promo portrait mode=canva
poster wakepark day pass promo portrait mode=openai
poster wakepark day pass promo portrait mode=local
```

Use `mode=canva` for editable poster production. Use `mode=openai` for direct image generation. Use `mode=local` for validation without generation.

## Inspiration Notes

Use `peg=` when you want to send creative direction with the request:

```text
poster wakepark day pass promo portrait peg="bold sports layout with energetic color"
```

The peg should describe what to borrow: layout feel, mood, color direction, composition or typography feel. Do not use it to copy another design exactly.

You can also use:

```text
poster wakepark day pass promo portrait inspo="clean magazine layout, big headline, strong product photo"
```

## Asset Folder Rule

Use one folder per brand or campaign. Put category folders inside it.

```text
/PosterAssets
  /WAKEPARK
    manifest.json
    /PRICING
    /PARK PERIPHERALS
    /LIFESTYLE SHOTS
    /WAKEPARK PHOTOS
    /LOGOS
    /RIDING PHOTOS
    /POSTER BACKGROUNDS
    /FONTS
```

Each main brand or campaign folder needs its own `manifest.json`. Subfolders do not need their own manifest.

## Manifest Example

```json
{
  "product": "wakepark",
  "aliases": ["wakepark", "wake park", "deca wakepark", "riding"],
  "brand": "Homies Approved Wakepark",
  "categoryFolders": {
    "pricing": "PRICING",
    "parkPeripherals": "PARK PERIPHERALS",
    "lifestyleShots": "LIFESTYLE SHOTS",
    "wakeparkPhotos": "WAKEPARK PHOTOS",
    "logos": "LOGOS",
    "ridingPhotos": "RIDING PHOTOS",
    "posterBackgrounds": "POSTER BACKGROUNDS",
    "fonts": "FONTS"
  },
  "assets": {
    "logo": "LOGOS/logo-main.png",
    "background": "POSTER BACKGROUNDS/background-main.jpg",
    "hero": "WAKEPARK PHOTOS/hero-main.jpg"
  },
  "styleNotes": "Outdoor wakepark energy, bold action photography, clean promo layout and readable offer text.",
  "defaultSize": "1024x1536",
  "defaultCta": "Ride with us"
}
```

## How To Update Photos

Upload or replace the image file, then update the category path in `manifest.json`.

Example:

```json
"hero": "WAKEPARK PHOTOS/hero-new.jpg"
```

The system uses the new file the next time you run a poster command.

## Local Test

Run this before connecting live services:

```powershell
powershell -ExecutionPolicy Bypass -File .\tests\run-local-checks.ps1
```

This checks the example folder, validates the manifest and builds a sample prompt.

## Live Setup Needed Later

You need these script properties in Google Apps Script:

```text
OPENAI_API_KEY
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_VERIFY_TOKEN
POSTER_ASSETS_ROOT_FOLDER_ID
OUTPUT_FOLDER_ID
ALLOWED_SENDER_NUMBER
```

## Common Errors

Unknown product:

```text
I could not find assets for "wakepark".
```

Missing file:

```text
I found wakepark, but these files are missing: hero: WAKEPARK PHOTOS/hero-main.jpg
```

Bad command:

```text
Use: poster product offer size. Example: poster wakepark day pass promo portrait
```

## Current Build Status

Local validation is ready. Canva is the default poster production workflow. OpenAI, Google Drive deployment and WhatsApp webhook setup still require your live credentials and account approvals.

## Canva Mode

Canva mode is for polished editable posters. The system prepares the poster brief, copy, brand notes and asset paths. Canva then creates or edits the poster as a design.

Use Canva when quality control matters more than full automation. Use OpenAI when you want the fastest WhatsApp-to-image output.
