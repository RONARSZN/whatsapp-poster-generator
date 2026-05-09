# WhatsApp Poster Generator User Manual

## What It Does

You send a poster command. The Vercel webhook parses the request, reads the matching brand `manifest.json`, generates short copy with Gemini, renders a Google Slides poster, exports it as PNG, saves it to Google Drive and sends the image back through WhatsApp.

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

In the Vercel runtime, all valid modes are still accepted by the parser. The live webhook path returns a generated image URL through the same poster pipeline so Meta receives a stable response.

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

`peg=` and `inspo=` influence Gemini copy and creative direction. They should steer mood, layout logic, composition, color direction or typography feel. They do not replace the brand manifest and should not be used to copy an exact design.

## Vercel Deployment Flow

The live webhook is now designed for Vercel serverless deployment. Push to GitHub, let Vercel auto-deploy the latest commit, then register this webhook URL in Meta:

```text
https://whatsapp-poster-generator.vercel.app/api/webhook
```

Required Vercel environment variables:

```text
GOOGLE_SERVICE_ACCOUNT_JSON
GEMINI_API_KEY
GOOGLE_DRIVE_FOLDER_ID
WHATSAPP_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_VERIFY_TOKEN
```

`GOOGLE_SERVICE_ACCOUNT_JSON` should be the full service account key JSON pasted as one line.

## Brand Command Examples

```text
poster wakepark day pass promo portrait peg="raw rider energy, bold sports layout"
poster proshop gear drop portrait peg="streetwear product drop feel"
poster ayo seasonal drink portrait peg="warm Kape Bahay neighborhood vibe"
poster messhall weekend menu portrait peg="hearty rider food after a session"
```

Supported brands:

A. `wakepark` - Decawake Clark Cable Park, `@decawake_clark`
B. `proshop` - Homies Approved Pro Shop, `@homiesapproved`
C. `ayo` - AYO Coffeehouse, `@ayo.coffeehouse`
D. `messhall` - Homies Messhall food and dining at Deca Wake Park

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

## Live Setup

You need these environment variables in Vercel:

```text
GOOGLE_SERVICE_ACCOUNT_JSON
GEMINI_API_KEY
GOOGLE_DRIVE_FOLDER_ID
WHATSAPP_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_VERIFY_TOKEN
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

Local validation is ready. Vercel deployment now replaces manual Google Apps Script redeployment. Google Drive, Gemini and WhatsApp still require valid live credentials in Vercel.

## Canva Mode

Canva mode is for polished editable poster briefs. The system prepares the poster brief, copy, brand notes and asset paths. Canva then creates or edits the poster as a design if your account supports the required Canva features.

Use Canva when quality control and brand asset control matter more than full automation. It stays brief-only in this zero-cost prototype.
