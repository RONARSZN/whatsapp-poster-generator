# Manifest Guide

Use one `manifest.json` per brand or campaign root folder. Subfolders are asset categories.

## Required Fields

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
    "hero": "WAKEPARK PHOTOS/hero-main.jpg",
    "background": "POSTER BACKGROUNDS/background-main.jpg"
  },
  "styleNotes": "Outdoor wakepark energy, bold action photography and readable offer text.",
  "defaultSize": "1024x1536",
  "defaultCta": "Ride with us"
}
```

## File Updates

When you change a photo filename, update the matching category path inside `assets`.
