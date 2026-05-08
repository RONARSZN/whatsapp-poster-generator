function doGet(e) {
  if (e && e.parameter && e.parameter.action === "status") {
    return jsonResponse_(getWebhookStatus_());
  }

  return verifyWebhook(e);
}

function doPost(e) {
  let message = null;
  try {
    const payload = parseJson_(e && e.postData && e.postData.contents);
    setWebhookStatus_("lastPostAt", new Date().toISOString());
    setWebhookStatus_("lastPostPayloadPreview", JSON.stringify(payload).slice(0, 1000));

    message = extractWhatsAppMessage_(payload);

    if (!message) {
      setWebhookStatus_("lastPostResult", "ignored_no_text_message");
      return jsonResponse_({ ok: true, ignored: true });
    }

    setWebhookStatus_("lastSender", message.from);
    setWebhookStatus_("lastMessageText", message.text);

    if (!isAllowedSender_(message.from)) {
      logEvent_("unauthorized_sender", { from: message.from });
      setWebhookStatus_("lastPostResult", "unauthorized_sender");
      sendWhatsAppText(message.from, "Sorry, you are not authorized to use this poster generator.");
      return jsonResponse_({ ok: true, ignored: true });
    }

    const result = handlePosterRequest_(message.from, message.text, message.id);
    setWebhookStatus_("lastPostResult", JSON.stringify(result));
    return jsonResponse_(result);
  } catch (error) {
    logEvent_("webhook_error", { message: error.message, stack: error.stack });
    setWebhookStatus_("lastPostResult", "error");
    setWebhookStatus_("lastError", error.message);
    if (message && message.from) {
      sendWhatsAppText(message.from, buildWebhookErrorMessage_(error));
    }
    return jsonResponse_({ ok: false, error: error.message });
  }
}

function handlePosterRequest_(sender, text, messageId) {
  if (isDuplicateMessage_(messageId)) {
    return { ok: true, duplicate: true };
  }

  if (isSmokeTestCommand_(text)) {
    sendWhatsAppText(sender, "Webhook test passed. The poster generator received your WhatsApp message.");
    logEvent_("webhook_smoke_test_passed", {
      sender: sender,
      messageId: messageId
    });
    return { ok: true, mode: "smoke_test" };
  }

  const command = parsePosterCommand(text);
  if (!command.ok) {
    sendWhatsAppText(sender, command.error);
    return { ok: false, error: command.error };
  }

  const match = findProductManifest(command.data.product, command.data.positionalBody);
  if (!match.ok) {
    sendWhatsAppText(sender, match.error);
    return { ok: false, error: match.error };
  }

  applyManifestDefaultsToCommand_(command.data, match.manifest, match.matchedName);

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

  if (command.data.mode === "template") {
    const image = generatePosterWithTemplate(command.data, match.manifest, match.folder);
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

  sendWhatsAppText(sender, "Unsupported mode for this zero-cost prototype. Use mode=template, mode=canva or mode=local.");
  return { ok: false, error: "Unsupported mode." };
}

function isSmokeTestCommand_(text) {
  const normalized = String(text || "").trim().toLowerCase();
  return normalized === "test" || normalized === "ping" || normalized === "poster test";
}

function getWebhookStatus_() {
  const props = PropertiesService.getScriptProperties();
  return {
    ok: true,
    lastPostAt: props.getProperty("lastPostAt") || "",
    lastSender: props.getProperty("lastSender") || "",
    lastMessageText: props.getProperty("lastMessageText") || "",
    lastPostResult: props.getProperty("lastPostResult") || "",
    lastError: props.getProperty("lastError") || "",
    hasWhatsappAccessToken: Boolean(props.getProperty("WHATSAPP_ACCESS_TOKEN")),
    hasWhatsappPhoneNumberId: Boolean(props.getProperty("WHATSAPP_PHONE_NUMBER_ID")),
    hasAllowedUsers: Boolean(props.getProperty("ALLOWED_USERS") || props.getProperty("ALLOWED_SENDER_NUMBER"))
  };
}

function setWebhookStatus_(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, String(value || ""));
}

function buildWebhookErrorMessage_(error) {
  return [
    "Poster generation failed.",
    "",
    String(error && error.message ? error.message : error).slice(0, 1000)
  ].join("\n");
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
