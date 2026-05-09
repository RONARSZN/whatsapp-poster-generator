import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generatePosterCopy } from "./gemini.js";
import { createPosterSlide, exportSlideAsPNG, saveImageToDrive } from "./google.js";
import { applyManifestDefaultsToCommand } from "./parser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const BRANDS_DIR = path.join(PROJECT_ROOT, "brands");
const FAILURE_MESSAGE = "Poster generation failed. Please try again or contact the team.";

/**
 * Run the full poster generation pipeline and return the public Drive URL.
 * @param {object} parsedCommand Parsed poster command data.
 * @returns {Promise<string>} Public Drive URL or failure message.
 */
export async function runPosterPipeline(parsedCommand) {
  try {
    const match = await findBrandManifest(parsedCommand.product, parsedCommand.positionalBody);
    applyManifestDefaultsToCommand(parsedCommand, match.manifest, match.matchedName);

    const copy = await generatePosterCopy(parsedCommand, match.manifest);
    const presentationId = await createPosterSlide(copy, match.manifest, parsedCommand.orientation);
    const imageBuffer = await exportSlideAsPNG(presentationId);
    const filename = buildPosterFilename(parsedCommand, match.manifest);

    return await saveImageToDrive(imageBuffer, filename);
  } catch (error) {
    console.log(JSON.stringify({ type: "poster_pipeline_failed", message: error.message }));
    return FAILURE_MESSAGE;
  }
}

/**
 * Build a non-image workflow reply for parser-compatible modes.
 * @param {object} parsedCommand Parsed poster command data.
 * @returns {Promise<string>} WhatsApp text reply for Canva or local mode.
 */
export async function buildPosterModeReply(parsedCommand) {
  const match = await findBrandManifest(parsedCommand.product, parsedCommand.positionalBody);
  applyManifestDefaultsToCommand(parsedCommand, match.manifest, match.matchedName);

  if (parsedCommand.mode === "canva") {
    return buildCanvaBriefMessage(parsedCommand, match.manifest);
  }

  if (parsedCommand.mode === "local") {
    return buildLocalValidationMessage(parsedCommand, match.manifest);
  }

  throw new Error(`Unsupported text mode: ${parsedCommand.mode}`);
}

/**
 * Find a brand manifest by product token or longest matching alias prefix.
 * @param {string} productName Product token from command.
 * @param {string} positionalBody Full positional command body.
 * @returns {Promise<{manifest: object, folder: string, matchedName: string}>} Matched manifest.
 */
export async function findBrandManifest(productName, positionalBody = productName) {
  try {
    const entries = await fs.readdir(BRANDS_DIR, { withFileTypes: true });
    const target = normalizeLookupText(productName);
    const body = normalizeLookupText(positionalBody || productName);
    let prefixMatch = null;

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const folder = path.join(BRANDS_DIR, entry.name);
      const manifest = await loadManifest(path.join(folder, "manifest.json"));
      const names = [manifest.product, ...(manifest.aliases || [])]
        .map((name) => normalizeLookupText(name))
        .filter(Boolean);

      if (names.includes(target)) {
        return { manifest, folder, matchedName: target };
      }

      const matchedName = findManifestNamePrefix(names, body);
      if (matchedName && (!prefixMatch || matchedName.length > prefixMatch.matchedName.length)) {
        prefixMatch = { manifest, folder, matchedName };
      }
    }

    if (prefixMatch) return prefixMatch;
    throw new Error(`I could not find assets for "${productName}".`);
  } catch (error) {
    console.log(JSON.stringify({ type: "brand_manifest_lookup_failed", message: error.message }));
    throw error;
  }
}

/**
 * Load a brand manifest JSON file.
 * @param {string} manifestPath Absolute manifest path.
 * @returns {Promise<object>} Parsed manifest.
 */
export async function loadManifest(manifestPath) {
  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    console.log(JSON.stringify({ type: "manifest_load_failed", path: manifestPath, message: error.message }));
    throw error;
  }
}

/**
 * Build a stable output filename for the generated PNG.
 * @param {object} command Parsed command.
 * @param {object} manifest Brand manifest.
 * @returns {string} PNG filename.
 */
export function buildPosterFilename(command, manifest) {
  const product = String(manifest.product || command.product || "poster").replace(/[^\w-]+/g, "-");
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "");
  return `${product}-${timestamp}.png`;
}

/**
 * Find the longest manifest name that prefixes the command body.
 * @param {string[]} names Normalized manifest names.
 * @param {string} body Normalized command body.
 * @returns {string} Matched name or empty string.
 */
function findManifestNamePrefix(names, body) {
  let matched = "";
  for (const name of names) {
    if ((body === name || body.indexOf(`${name} `) === 0) && name.length > matched.length) {
      matched = name;
    }
  }
  return matched;
}

/**
 * Normalize manifest lookup text for product and alias matching.
 * @param {string} value Raw lookup text.
 * @returns {string} Normalized lookup text.
 */
function normalizeLookupText(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Build a concise WhatsApp brief for manual Canva production.
 * @param {object} command Parsed command with manifest defaults applied.
 * @param {object} manifest Brand manifest.
 * @returns {string} WhatsApp-ready brief.
 */
function buildCanvaBriefMessage(command, manifest) {
  const lines = [
    "Canva poster brief ready.",
    "",
    `Brand: ${manifest.brand || manifest.product}`,
    `Product: ${manifest.product}`,
    `Offer: ${command.offer}`,
    `Size: ${command.size}`,
    `CTA: ${command.cta || manifest.defaultCta || "Order today"}`
  ];

  if (command.pegNotes) {
    lines.push(`Peg: ${command.pegNotes}`);
  }

  const assets = Object.keys(manifest.assets || {});
  if (assets.length) {
    lines.push(`Assets: ${assets.join(", ")}`);
  }

  lines.push(
    "",
    "Use this as creative direction only. Keep brand assets and manifest copy as the source of truth."
  );

  return lines.join("\n");
}

/**
 * Build a local validation reply without creating a poster image.
 * @param {object} command Parsed command with manifest defaults applied.
 * @param {object} manifest Brand manifest.
 * @returns {string} WhatsApp-ready validation reply.
 */
function buildLocalValidationMessage(command, manifest) {
  return [
    "Local validation passed.",
    "",
    `Mode: ${command.mode}`,
    `Brand: ${manifest.brand || manifest.product}`,
    `Product: ${manifest.product}`,
    `Offer: ${command.offer}`,
    `Size: ${command.size}`,
    `CTA: ${command.cta || manifest.defaultCta || "Order today"}`
  ].join("\n");
}
