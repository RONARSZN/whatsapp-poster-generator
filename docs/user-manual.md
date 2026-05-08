# WhatsApp Poster Generator User Manual

## What It Does

You send a poster command. The system finds the matching asset folder, reads its `manifest.json`, renders a simple no-AI poster and sends it back through WhatsApp after live integrations are connected.

## Basic Command

```text
poster wakepark day pass promo portrait
```

You can also use:

```text
poster product=wakepark offer="day pass promo" size=portrait cta="Ride with us"
```

## Production Mode

Template is the default production mode:

```text
poster wakepark day pass promo portrait
```

Use an explicit mode only when you want to override the default:

```text
poster wakepark day pass promo portrait mode=canva
poster wakepark day pass promo portrait mode=template
poster wakepark day pass promo portrait mode=local
```

Use `mode=template` for the first working no-AI poster reply. Template mode can run with only a matching `manifest.json`; missing image files fall back to a simple placeholder layout. Use `mode=canva` for editable poster briefs only. Use `mode=local` for validation without generation.

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
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_VERIFY_TOKEN
POSTER_ASSETS_ROOT_FOLDER_ID
OUTPUT_FOLDER_ID
ALLOWED_USERS
```

Only approved WhatsApp numbers can use the bot. Everyone else receives:

```text
Sorry, you are not authorized to use this poster generator.
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

This missing-file check applies to validation and brief modes. Template mode skips that check so the prototype can still return a poster.

Bad command:

```text
Use: poster product offer size. Example: poster wakepark day pass promo portrait
```

## Current Build Status

Local validation is ready. Template mode is the default poster production workflow for the first prototype. Google Drive deployment and WhatsApp webhook setup still require your live credentials and account approvals.

## Canva Mode

Canva mode is for polished editable poster briefs. The system prepares the poster brief, copy, brand notes and asset paths. Canva then creates or edits the poster as a design if your account supports the required Canva features.

Use Canva when quality control and brand asset control matter more than full automation. It stays brief-only in this zero-cost prototype.
