# Manifest Guide

Use one `manifest.json` per brand or campaign root folder. Subfolders are asset categories.

## Required Fields

```json
{
  "product": "wakepark",
  "aliases": ["wakepark", "wake park", "deca wakepark", "riding"],
  "brand": "Homies Approved Wakepark",
  "brand_voice": "Raw, hyped and community-driven.",
  "colors": {
    "primary": "#0A0A0A",
    "secondary": "#FFFFFF",
    "accent": "#D4F500"
  },
  "typography": "Bold condensed sans-serif.",
  "promo_types": ["day_pass", "beginner_session", "weekend_promo"],
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
    "hero": "WAKEPARK PHOTOS/hero-main.jpg",
    "background": "POSTER BACKGROUNDS/background-main.jpg"
  },
  "styleNotes": "Outdoor wakepark energy, bold action photography and readable offer text.",
  "defaultSize": "1024x1536",
  "defaultCta": "Ride with us",
  "fallback_copy": {
    "headline": "RIDE. REPEAT.",
    "tagline": "Clark's legit cable park.",
    "cta": "Book your session now."
  }
}
```

The original manifest schema remains intact. Vercel adds `brand_voice`, `colors`, `typography`, `promo_types` and `fallback_copy` so Gemini can generate copy and still fail silently to safe brand text.

## File Updates

When you change a photo filename, update the matching category path inside `assets`.
