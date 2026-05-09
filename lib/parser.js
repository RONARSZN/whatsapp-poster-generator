const SIZE_WORDS = new Set(["square", "portrait", "story", "landscape"]);
const VALID_MODES = new Set(["template", "canva", "local"]);

/**
 * Parse a WhatsApp poster command into the preserved command structure.
 * @param {string} text Raw WhatsApp message text.
 * @returns {{ok: boolean, data?: object, error?: string}} Parsed command result.
 */
export function parsePosterCommand(text) {
  const raw = String(text || "").trim();
  if (!raw.toLowerCase().startsWith("poster")) {
    return {
      ok: false,
      error: "Use: poster product offer size. Example: poster coffee 20% off portrait"
    };
  }

  const body = raw.replace(/^poster\s*/i, "").trim();
  const kv = parseKeyValueArgs(body);
  const positionalBody = stripKeyValueArgs(body);
  const tokens = positionalBody.split(/\s+/).filter(Boolean);

  const product = kv.product || findProductToken(tokens) || "";
  const size = normalizeSize(kv.size || findSizeToken(tokens) || "portrait");
  const mode = normalizeMode(kv.mode || "template");
  const style = kv.style || "default";
  const cta = kv.cta || "";
  const pegNotes = kv.peg || kv.pegnotes || kv.inspo || "";
  const offer = kv.offer || inferOffer(tokens);

  if (!product) {
    return { ok: false, error: "Missing product. Example: poster coffee 20% off portrait" };
  }

  if (!mode) {
    return { ok: false, error: "Invalid mode. This zero-cost prototype supports mode=template, mode=canva or mode=local." };
  }

  return {
    ok: true,
    data: {
      product: product.toLowerCase(),
      offer: offer || "Special offer",
      size,
      orientation: normalizeOrientation(kv.size || findSizeToken(tokens) || "portrait"),
      mode,
      style,
      cta,
      pegNotes,
      rawText: raw,
      positionalBody,
      hasExplicitOffer: Boolean(kv.offer),
      hasExplicitCta: Boolean(kv.cta)
    }
  };
}

/**
 * Apply manifest-owned defaults to a parsed command.
 * @param {object} command Parsed command data object.
 * @param {object} manifest Brand manifest.
 * @param {string} matchedName Manifest product or alias that matched the command.
 * @returns {object} Mutated command object.
 */
export function applyManifestDefaultsToCommand(command, manifest, matchedName) {
  command.product = manifest.product || command.product;

  if (!command.hasExplicitOffer) {
    command.offer = inferOfferFromBody(command.positionalBody, matchedName) || "Special offer";
  }

  if (!command.hasExplicitCta) {
    command.cta = manifest.defaultCta || manifest.fallback_copy?.cta || "Order today";
  }

  return command;
}

/**
 * Parse key=value command arguments, including quoted values.
 * @param {string} body Command body without the leading poster keyword.
 * @returns {Record<string, string>} Parsed lowercase key-value map.
 */
export function parseKeyValueArgs(body) {
  const result = {};
  const regex = /(\w+)=("[^"]+"|'[^']+'|[^\s]+)/g;
  let match;
  while ((match = regex.exec(body)) !== null) {
    result[match[1].toLowerCase()] = String(match[2]).replace(/^["']|["']$/g, "");
  }
  return result;
}

/**
 * Remove key=value command arguments before positional parsing.
 * @param {string} body Command body.
 * @returns {string} Positional command body.
 */
export function stripKeyValueArgs(body) {
  return String(body || "").replace(/(\w+)=("[^"]+"|'[^']+'|[^\s]+)/g, "").trim();
}

/**
 * Normalize a size keyword into the established image size string.
 * @param {string} size Size keyword.
 * @returns {string} Image size string.
 */
export function normalizeSize(size) {
  const value = String(size || "").toLowerCase();
  if (value === "square") return "1024x1024";
  if (value === "landscape") return "1536x1024";
  return "1024x1536";
}

/**
 * Normalize a poster mode alias into a supported mode.
 * @param {string} mode Raw mode value.
 * @returns {string} Supported mode or empty string.
 */
export function normalizeMode(mode) {
  const value = String(mode || "").toLowerCase();
  if (value === "template" || value === "poster") return "template";
  if (value === "canva") return "canva";
  if (value === "local" || value === "test") return "local";
  return VALID_MODES.has(value) ? value : "";
}

/**
 * Normalize a size keyword into layout orientation.
 * @param {string} size Size keyword.
 * @returns {"portrait" | "landscape" | "square"} Orientation.
 */
export function normalizeOrientation(size) {
  const value = String(size || "").toLowerCase();
  if (value === "landscape") return "landscape";
  if (value === "square") return "square";
  return "portrait";
}

/**
 * Infer the offer from positional tokens after the product token.
 * @param {string[]} tokens Positional command tokens.
 * @returns {string} Offer text.
 */
function inferOffer(tokens) {
  return tokens
    .slice(1)
    .filter((token) => !isSizeToken(token) && !/^\w+=/.test(token))
    .join(" ")
    .trim();
}

/**
 * Infer the offer from the body after removing the matched product or alias.
 * @param {string} body Positional body.
 * @param {string} matchedName Matched manifest name.
 * @returns {string} Offer text.
 */
function inferOfferFromBody(body, matchedName) {
  const withoutProduct = removeMatchedProductFromBody(body, matchedName);
  return withoutProduct
    .split(/\s+/)
    .filter((token) => token && !isSizeToken(token))
    .join(" ")
    .trim();
}

/**
 * Remove the matched product or alias from the start of the command body.
 * @param {string} body Positional body.
 * @param {string} matchedName Matched manifest name.
 * @returns {string} Remaining body text.
 */
function removeMatchedProductFromBody(body, matchedName) {
  const value = String(body || "").trim();
  const product = String(matchedName || "").trim();
  if (!value || !product) return value;

  const normalizedValue = normalizeSpaces(value).toLowerCase();
  const normalizedProduct = normalizeSpaces(product).toLowerCase();
  if (normalizedValue === normalizedProduct) return "";
  if (normalizedValue.indexOf(`${normalizedProduct} `) === 0) {
    return value.slice(product.length).trim();
  }

  return value;
}

/**
 * Find the first size token in a token list.
 * @param {string[]} tokens Positional command tokens.
 * @returns {string} Size token or empty string.
 */
function findSizeToken(tokens) {
  return tokens.find((token) => isSizeToken(token)) || "";
}

/**
 * Find the first non-size token as the product token.
 * @param {string[]} tokens Positional command tokens.
 * @returns {string} Product token or empty string.
 */
function findProductToken(tokens) {
  return tokens.find((token) => !isSizeToken(token) && !/^\w+=/.test(token)) || "";
}

/**
 * Check whether a token is one of the supported size words.
 * @param {string} token Candidate token.
 * @returns {boolean} True when the token is a size word.
 */
function isSizeToken(token) {
  return SIZE_WORDS.has(String(token || "").toLowerCase());
}

/**
 * Collapse repeated whitespace in a value.
 * @param {string} value Raw text.
 * @returns {string} Normalized text.
 */
function normalizeSpaces(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}
