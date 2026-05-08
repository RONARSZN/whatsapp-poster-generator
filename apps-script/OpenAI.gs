function generatePosterWithOpenAI(prompt, assets, command) {
  const cfg = getConfig_();
  const apiKey = requireConfigValue_("OPENAI_API_KEY", cfg.openAiApiKey);
  const payload = {
    model: cfg.openAiImageModel,
    prompt: prompt,
    size: command.size,
    quality: cfg.defaultQuality,
    n: 1
  };

  const response = UrlFetchApp.fetch("https://api.openai.com/v1/images/generations", {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + apiKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  const text = response.getContentText();
  const body = parseOpenAiJson_(text);
  if (status < 200 || status >= 300) {
    throw new Error("OpenAI image generation failed (" + status + "): " + summarizeOpenAiError_(body, text));
  }

  const first = body.data && body.data[0];
  if (!first || !first.b64_json) {
    throw new Error("OpenAI response did not include image data.");
  }

  return { base64: first.b64_json };
}

function parseOpenAiJson_(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function summarizeOpenAiError_(body, text) {
  if (body && body.error && body.error.message) {
    return body.error.message;
  }

  return String(text || "Unknown OpenAI error.").slice(0, 500);
}
