# Setup Notes

## Local First

Use `templates/asset-folder-example` for local validation before connecting live services.

## Recommended WhatsApp Integration

Use Meta WhatsApp Cloud API as the first-choice WhatsApp integration.

Twilio is not the default plan because it adds an extra per-message fee. Meta WhatsApp Cloud API is the preferred path for reducing platform costs.

Users do not get access to the code, Apps Script project, backend or API keys. They only send poster requests to the WhatsApp bot from an approved phone number.

Basic flow:

```text
WhatsApp User
-> Meta WhatsApp Cloud API
-> Backend Webhook
-> Access Check
-> Poster Generator
-> Send Poster Image Back to WhatsApp
```

## Vercel Serverless

Vercel is now the deployment target. Push to GitHub, let Vercel deploy the latest commit and use this webhook URL in Meta:

```text
https://whatsapp-poster-generator.vercel.app/api/webhook
```

The webhook endpoint is:

```text
/api/webhook.js
```

Use Node.js `24.x` in `package.json` and Vercel project settings.

Set these environment variables in Vercel:

```text
GOOGLE_SERVICE_ACCOUNT_JSON
GEMINI_API_KEY
GOOGLE_DRIVE_FOLDER_ID
WHATSAPP_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_VERIFY_TOKEN
```

`GOOGLE_SERVICE_ACCOUNT_JSON` should be the full service account JSON pasted as a single-line string.

## Google Apps Script Reference

The old Apps Script files remain in `apps-script/` as a migration reference. They are not the live deployment target for the Vercel flow.

## Environment Variables

Set these in Vercel project settings:

```text
GOOGLE_SERVICE_ACCOUNT_JSON
GEMINI_API_KEY
GOOGLE_DRIVE_FOLDER_ID
WHATSAPP_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_VERIFY_TOKEN
```

Do not hardcode live phone numbers, folder IDs, verify tokens or account-specific values in source files.

This build does not need OpenAI, Ideogram, Replicate, Canva Enterprise or any paid image-generation API.

## Canva Mode

Template mode is the default prototype path. It creates a simple no-AI poster through Google Slides, exports it as PNG, saves it to Drive and sends it through WhatsApp.

Use Canva mode only when you want an editable brief. It does not auto-create or export Canva designs in this zero-cost prototype.

Default command:

```text
poster wakepark day pass promo portrait
```

Template override:

```text
poster wakepark day pass promo portrait mode=template
```

Optional peg notes:

```text
poster wakepark day pass promo portrait peg="bold sports layout with energetic color"
```

Peg notes guide mood, layout logic, composition, color direction or typography feel. They do not replace brand assets.

## Phase: WhatsApp Cloud API Integration

- [ ] Create Meta Developer account
- [ ] Create Meta app
- [ ] Set up WhatsApp Cloud API
- [ ] Add WhatsApp Business phone number or test number
- [ ] Create backend webhook endpoint
- [ ] Connect webhook URL to Meta app
- [ ] Receive incoming WhatsApp messages
- [ ] Extract sender phone number and message body
- [ ] Check sender against approved users list
- [ ] Parse poster request details
- [ ] Generate poster image
- [ ] Upload or host generated image if required
- [ ] Send poster image back through WhatsApp Cloud API

## Drive Output Folder

Create one Google Drive folder for generated posters and store that folder ID in `GOOGLE_DRIVE_FOLDER_ID`.

Brand data now lives in committed manifests under `/brands`. Keep private source assets out of Git in `assets-local/` or `private-assets/` unless a specific asset is safe to commit.

For better Wakepark output, add these exact files:

```text
WAKEPARK/LOGOS/logo-main.png
WAKEPARK/POSTER BACKGROUNDS/background-main.jpg
WAKEPARK/WAKEPARK PHOTOS/hero-main.jpg
WAKEPARK/RIDING PHOTOS/riding-main.jpg
```

Template mode can still return a prototype poster if these files are missing. It will use a simple placeholder layout instead of real photos.

Add Pro Shop assets by category:

```text
PROSHOP/BOARDS/
PROSHOP/BOOTS/
PROSHOP/VESTS/
PROSHOP/HELMETS/
PROSHOP/MERCH/
```

The Pro Shop folder already has a `manifest.json`, so the bot can recognize `proshop`, `pro shop`, `boards`, `boots`, `vests`, `helmets` and `merch`.
