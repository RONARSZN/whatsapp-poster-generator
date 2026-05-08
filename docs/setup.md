# Setup Notes

## Local First

Use `templates/asset-folder-example` for local validation before connecting live services.

## Google Apps Script

1. Create a new Apps Script project.
2. Copy files from `apps-script`.
3. Set script properties.
4. Deploy as a web app.
5. Use the web app URL as the Meta WhatsApp webhook URL.

## Script Properties

Set these in Apps Script project settings:

```text
OPENAI_API_KEY
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_VERIFY_TOKEN
POSTER_ASSETS_ROOT_FOLDER_ID
OUTPUT_FOLDER_ID
ALLOWED_SENDER_NUMBER
OPENAI_IMAGE_MODEL
DEFAULT_IMAGE_QUALITY
```

Recommended low-cost default:

```text
OPENAI_IMAGE_MODEL=gpt-image-1-mini
DEFAULT_IMAGE_QUALITY=low
```

## Canva Mode

Canva is the default editable design path. The system prepares the poster brief, selected asset paths and copy. Canva can then generate or edit the poster as a design.

Use Canva when you want editable posters, reusable brand layouts and manual refinement. Use OpenAI when you want faster direct image output.

Default command:

```text
poster wakepark day pass promo portrait
```

OpenAI override:

```text
poster wakepark day pass promo portrait mode=openai
```

Optional peg notes:

```text
poster wakepark day pass promo portrait peg="bold sports layout with energetic color"
```

Peg notes guide mood, layout logic, composition, color direction or typography feel. They do not replace brand assets.
