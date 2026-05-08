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
  const body = JSON.parse(response.getContentText());
  if (status < 200 || status >= 300) {
    throw new Error("OpenAI image generation failed: " + response.getContentText());
  }

  const first = body.data && body.data[0];
  if (!first || !first.b64_json) {
    throw new Error("OpenAI response did not include image data.");
  }

  return { base64: first.b64_json };
}

