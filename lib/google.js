import { Readable } from "node:stream";

import { google } from "googleapis";

/**
 * Create an authenticated Google API client from service account JSON.
 * @returns {import("google-auth-library").JWT} Authenticated JWT client.
 */
export function getGoogleAuthClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON.");
  }

  const credentials = JSON.parse(raw);
  return new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/presentations"
    ]
  });
}

/**
 * Create a one-slide Google Slides poster with brand colors and copy.
 * @param {{headline: string, tagline: string, cta: string}} copy Poster copy.
 * @param {object} manifest Brand manifest.
 * @param {string} orientation Layout orientation.
 * @returns {Promise<string>} Presentation ID.
 */
export async function createPosterSlide(copy, manifest, orientation = "portrait") {
  try {
    const auth = getGoogleAuthClient();
    const slides = google.slides({ version: "v1", auth });
    const title = `${manifest.product || "poster"}-${Date.now()}`;
    const created = await slides.presentations.create({
      requestBody: { title }
    });
    const presentationId = created.data.presentationId;
    const presentation = await slides.presentations.get({ presentationId });
    const slide = presentation.data.slides?.[0];
    const slideObjectId = slide?.objectId;

    if (!presentationId || !slideObjectId) {
      throw new Error("Google Slides did not create a usable first slide.");
    }

    await slides.presentations.batchUpdate({
      presentationId,
      requestBody: {
        requests: buildSlideRequests(slideObjectId, copy, manifest, orientation)
      }
    });

    return presentationId;
  } catch (error) {
    console.log(JSON.stringify({ type: "google_create_slide_failed", message: error.message }));
    throw error;
  }
}

/**
 * Export the first slide in a presentation as a PNG buffer.
 * @param {string} presentationId Google Slides presentation ID.
 * @returns {Promise<Buffer>} PNG image buffer.
 */
export async function exportSlideAsPNG(presentationId) {
  try {
    const auth = getGoogleAuthClient();
    const slides = google.slides({ version: "v1", auth });
    const presentation = await slides.presentations.get({ presentationId });
    const slideObjectId = presentation.data.slides?.[0]?.objectId;
    if (!slideObjectId) {
      throw new Error("Presentation has no slide to export.");
    }

    const thumbnail = await slides.presentations.pages.getThumbnail({
      presentationId,
      pageObjectId: slideObjectId,
      "thumbnailProperties.mimeType": "PNG",
      "thumbnailProperties.thumbnailSize": "LARGE"
    });

    const contentUrl = thumbnail.data.contentUrl;
    if (!contentUrl) {
      throw new Error("Slides thumbnail export did not return a URL.");
    }

    const response = await fetch(contentUrl);
    if (!response.ok) {
      throw new Error(`Slides thumbnail download failed: ${response.status}`);
    }

    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    console.log(JSON.stringify({ type: "google_export_slide_failed", message: error.message }));
    throw error;
  }
}

/**
 * Save a PNG image buffer to Google Drive and make it publicly viewable.
 * @param {Buffer} imageBuffer PNG buffer.
 * @param {string} filename Output filename.
 * @returns {Promise<string>} Public image URL.
 */
export async function saveImageToDrive(imageBuffer, filename) {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID.");
    }

    const auth = getGoogleAuthClient();
    const drive = google.drive({ version: "v3", auth });
    const created = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
        mimeType: "image/png"
      },
      media: {
        mimeType: "image/png",
        body: Readable.from(imageBuffer)
      },
      fields: "id, webViewLink, webContentLink"
    });

    const fileId = created.data.id;
    if (!fileId) {
      throw new Error("Drive file creation did not return an ID.");
    }

    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone"
      }
    });

    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`;
  } catch (error) {
    console.log(JSON.stringify({ type: "google_save_image_failed", message: error.message }));
    throw error;
  }
}

/**
 * Build Google Slides batchUpdate requests for the poster layout.
 * @param {string} slideObjectId First slide object ID.
 * @param {{headline: string, tagline: string, cta: string}} copy Poster copy.
 * @param {object} manifest Brand manifest.
 * @param {string} orientation Layout orientation.
 * @returns {object[]} Slides batchUpdate requests.
 */
function buildSlideRequests(slideObjectId, copy, manifest, orientation) {
  const colors = manifest.colors || {};
  const primary = hexToRgb(colors.primary || "#111111");
  const secondary = hexToRgb(colors.secondary || "#FFFFFF");
  const accent = hexToRgb(colors.accent || "#D4F500");
  const layout = getLayout(orientation);

  return [
    {
      updatePageProperties: {
        objectId: slideObjectId,
        pageProperties: {
          pageBackgroundFill: {
            solidFill: { color: { rgbColor: primary } }
          }
        },
        fields: "pageBackgroundFill"
      }
    },
    createTextBoxRequest("headlineBox", slideObjectId, copy.headline, layout.headline, secondary, 36, true),
    createTextBoxRequest("taglineBox", slideObjectId, copy.tagline, layout.tagline, secondary, 18, false),
    createTextBoxRequest("ctaBox", slideObjectId, copy.cta, layout.cta, accent, 20, true),
    createTextBoxRequest("brandBox", slideObjectId, manifest.brand || manifest.product || "", layout.brand, accent, 11, true)
  ].flat();
}

/**
 * Build requests that create and style one text box.
 * @param {string} objectId Shape object ID.
 * @param {string} pageObjectId Slide object ID.
 * @param {string} text Text content.
 * @param {{x: number, y: number, width: number, height: number}} box Box geometry.
 * @param {{red: number, green: number, blue: number}} color Text color.
 * @param {number} fontSize Font size in points.
 * @param {boolean} bold Whether the text is bold.
 * @returns {object[]} Slides batchUpdate requests.
 */
function createTextBoxRequest(objectId, pageObjectId, text, box, color, fontSize, bold) {
  return [
    {
      createShape: {
        objectId,
        shapeType: "TEXT_BOX",
        elementProperties: {
          pageObjectId,
          size: {
            width: { magnitude: box.width, unit: "PT" },
            height: { magnitude: box.height, unit: "PT" }
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: box.x,
            translateY: box.y,
            unit: "PT"
          }
        }
      }
    },
    {
      insertText: {
        objectId,
        text: String(text || "")
      }
    },
    {
      updateTextStyle: {
        objectId,
        textRange: { type: "ALL" },
        style: {
          foregroundColor: { opaqueColor: { rgbColor: color } },
          fontFamily: "Arial",
          fontSize: { magnitude: fontSize, unit: "PT" },
          bold
        },
        fields: "foregroundColor,fontFamily,fontSize,bold"
      }
    }
  ];
}

/**
 * Return poster text geometry for the requested orientation.
 * @param {string} orientation Layout orientation.
 * @returns {Record<string, {x: number, y: number, width: number, height: number}>} Layout boxes.
 */
function getLayout(orientation) {
  if (orientation === "landscape") {
    return {
      brand: { x: 36, y: 28, width: 420, height: 32 },
      headline: { x: 36, y: 120, width: 360, height: 110 },
      tagline: { x: 36, y: 246, width: 360, height: 70 },
      cta: { x: 36, y: 360, width: 420, height: 54 }
    };
  }

  return {
    brand: { x: 36, y: 28, width: 300, height: 32 },
    headline: { x: 36, y: 125, width: 300, height: 140 },
    tagline: { x: 36, y: 285, width: 300, height: 90 },
    cta: { x: 36, y: 445, width: 300, height: 54 }
  };
}

/**
 * Convert a hex color into Google Slides RGB float values.
 * @param {string} hex Hex color.
 * @returns {{red: number, green: number, blue: number}} RGB color.
 */
function hexToRgb(hex) {
  const clean = String(hex || "#000000").replace("#", "");
  const value = clean.length === 3
    ? clean.split("").map((char) => char + char).join("")
    : clean.padEnd(6, "0").slice(0, 6);

  return {
    red: parseInt(value.slice(0, 2), 16) / 255,
    green: parseInt(value.slice(2, 4), 16) / 255,
    blue: parseInt(value.slice(4, 6), 16) / 255
  };
}
