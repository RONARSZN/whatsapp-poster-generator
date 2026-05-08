function doGet(e) {
  return verifyWebhook(e);
}

function doPost(e) {
  try {
    const payload = parseJson_(e && e.postData && e.postData.contents);
    const message = extractWhatsAppMessage_(payload);

    if (!message) {
      return jsonResponse_({ ok: true, ignored: true });
    }

    if (!isAllowedSender_(message.from)) {
      logEvent_("unauthorized_sender", { from: message.from });
      return jsonResponse_({ ok: true, ignored: true });
    }

    const result = handlePosterRequest_(message.from, message.text, message.id);
    return jsonResponse_(result);
  } catch (error) {
    logEvent_("webhook_error", { message: error.message, stack: error.stack });
    return jsonResponse_({ ok: false, error: error.message });
  }
}

function handlePosterRequest_(sender, text, messageId) {
  if (isDuplicateMessage_(messageId)) {
    return { ok: true, duplicate: true };
  }

  const command = parsePosterCommand(text);
  if (!command.ok) {
    sendWhatsAppText(sender, command.error);
    return { ok: false, error: command.error };
  }

  const match = findProductManifest(command.data.product);
  if (!match.ok) {
    sendWhatsAppText(sender, match.error);
    return { ok: false, error: match.error };
  }

  const validation = validateManifestAssets(match.manifest, match.folder);
  if (!validation.ok) {
    sendWhatsAppText(sender, validation.error);
    return { ok: false, error: validation.error };
  }

  const prompt = buildPosterPrompt(command.data, match.manifest);
  if (command.data.mode === "local") {
    sendWhatsAppText(sender, buildLocalValidationMessage_(command.data, match.manifest, prompt));
    logEvent_("poster_validated", {
      sender: sender,
      messageId: messageId,
      product: command.data.product,
      mode: command.data.mode
    });
    return { ok: true, mode: command.data.mode, prompt: prompt };
  }

  if (command.data.mode === "canva") {
    const brief = buildCanvaPosterBrief(command.data, match.manifest);
    sendWhatsAppText(sender, buildCanvaBriefMessage_(brief));
    logEvent_("canva_brief_created", {
      sender: sender,
      messageId: messageId,
      product: command.data.product,
      mode: command.data.mode
    });
    return { ok: true, mode: command.data.mode, brief: brief };
  }

  const assets = loadSelectedAssets(match.manifest, match.folder);
  const image = generatePosterWithOpenAI(prompt, assets, command.data);
  const saved = savePosterToDrive(image, command.data, match.manifest);
  sendWhatsAppImage(sender, saved);

  logEvent_("poster_generated", {
    sender: sender,
    messageId: messageId,
    product: command.data.product,
    mode: command.data.mode,
    outputFileId: saved.fileId
  });

  return { ok: true, mode: command.data.mode, fileId: saved.fileId };
}

function buildCanvaBriefMessage_(brief) {
  const lines = [
    "Canva poster brief ready.",
    "",
    "Title: " + brief.title,
    "Brand: " + brief.brand,
    "Offer: " + brief.offer,
    "Size: " + brief.size,
    "CTA: " + brief.cta
  ];

  if (brief.pegNotes) {
    lines.push("Peg: " + brief.pegNotes);
  }

  return lines.concat([
    "Assets: " + Object.keys(brief.requiredAssets || {}).join(", "),
    "",
    brief.prompt
  ]).join("\n");
}

function buildLocalValidationMessage_(command, manifest, prompt) {
  return [
    "Local validation passed.",
    "",
    "Mode: " + command.mode,
    "Brand: " + (manifest.brand || manifest.product),
    "Product: " + manifest.product,
    "Offer: " + command.offer,
    "Size: " + command.size,
    "",
    prompt
  ].join("\n");
}
