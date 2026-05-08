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

## Google Apps Script

1. Create a new Apps Script project.
2. Copy files from `apps-script`.
3. Set script properties.
4. Deploy as a web app.
5. Use the web app URL as the Meta WhatsApp webhook URL.

## Script Properties

Set these in Apps Script project settings:

```text
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_VERIFY_TOKEN
POSTER_ASSETS_ROOT_FOLDER_ID
OUTPUT_FOLDER_ID
ALLOWED_USERS
```

Do not hardcode live phone numbers, folder IDs, verify tokens or account-specific values in source files. Keep them in Apps Script Properties.

`ALLOWED_USERS` should contain approved WhatsApp phone numbers. Use E.164 format with country code:

```javascript
ALLOWED_USERS = [
  "+639171234567",
  "+639181234567"
]
```

If the sender is not in `ALLOWED_USERS`, reply:

```text
Sorry, you are not authorized to use this poster generator.
```

This prototype does not need OpenAI, Ideogram, Replicate, Canva Enterprise or any paid image-generation API.

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

## Drive Asset Folders

Create one private Google Drive root folder for poster assets, then put each brand or campaign folder inside it. Store the root folder ID in `POSTER_ASSETS_ROOT_FOLDER_ID`.

Create a separate output folder for generated posters and store that folder ID in `OUTPUT_FOLDER_ID`.

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
