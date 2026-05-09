const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/**
 * Generate short poster copy with Gemini and fall back silently on failure.
 * @param {object} parsedCommand Parsed poster command.
 * @param {object} manifest Brand manifest.
 * @returns {Promise<{headline: string, tagline: string, cta: string}>} Poster copy.
 */
export async function generatePosterCopy(parsedCommand, manifest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return getFallbackCopy(manifest);

    const prompt = buildGeminiPrompt(parsedCommand, manifest);
    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.8
      }
    };

    const url = `${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.status === 429 || response.status >= 500) {
        if (attempt < 3) await sleep(1500 * attempt);
        continue;
      }

      if (!response.ok) return getFallbackCopy(manifest);

      const body = await response.json();
      const text = body?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      try {
        return normalizeCopy(JSON.parse(text), manifest);
      } catch {
        return getFallbackCopy(manifest);
      }
    }

    return getFallbackCopy(manifest);
  } catch {
    return getFallbackCopy(manifest);
  }
}

/**
 * Build the Gemini prompt from brand voice, colors, promo type and peg notes.
 * @param {object} parsedCommand Parsed command.
 * @param {object} manifest Brand manifest.
 * @returns {string} Prompt text.
 */
export function buildGeminiPrompt(parsedCommand, manifest) {
  return [
    "Create promotional poster copy for this brand.",
    "",
    `Brand: ${manifest.brand || manifest.product}`,
    `Handle: ${manifest.handle || ""}`,
    `Brand voice: ${manifest.brand_voice || manifest.styleNotes || ""}`,
    `Colors: ${JSON.stringify(manifest.colors || {})}`,
    `Typography: ${manifest.typography || ""}`,
    `Promo type or offer: ${parsedCommand.offer}`,
    `Allowed promo types: ${(manifest.promo_types || []).join(", ")}`,
    `CTA hint: ${parsedCommand.cta || manifest.defaultCta || ""}`,
    `Peg note: ${parsedCommand.pegNotes || "none"}`,
    "",
    "Return ONLY raw JSON. Do not use markdown fencing.",
    '{ "headline": "...", "tagline": "...", "cta": "..." }',
    "Headline max 5 words. Tagline max 10 words. CTA max 8 words.",
    "Copy must feel authentic to Philippine rider and youth culture where relevant to the brand.",
    "Do not invent unsupported claims, prices, dates or celebrity names."
  ].join("\n");
}

/**
 * Promise-based sleep helper for retries.
 * @param {number} ms Milliseconds.
 * @returns {Promise<void>} Resolves after the delay.
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Normalize Gemini copy and fill missing fields from manifest fallback copy.
 * @param {object} copy Gemini JSON object.
 * @param {object} manifest Brand manifest.
 * @returns {{headline: string, tagline: string, cta: string}} Normalized copy.
 */
function normalizeCopy(copy, manifest) {
  const fallback = getFallbackCopy(manifest);
  return {
    headline: String(copy?.headline || fallback.headline).trim(),
    tagline: String(copy?.tagline || fallback.tagline).trim(),
    cta: String(copy?.cta || fallback.cta).trim()
  };
}

/**
 * Read manifest fallback copy with generic final fallbacks.
 * @param {object} manifest Brand manifest.
 * @returns {{headline: string, tagline: string, cta: string}} Fallback copy.
 */
function getFallbackCopy(manifest) {
  return {
    headline: manifest.fallback_copy?.headline || "POSTER READY",
    tagline: manifest.fallback_copy?.tagline || "Made for the community.",
    cta: manifest.fallback_copy?.cta || manifest.defaultCta || "Message us today."
  };
}
