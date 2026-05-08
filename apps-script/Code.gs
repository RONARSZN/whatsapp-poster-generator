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
  const assets = loadSelectedAssets(match.manifest, match.folder);
  const image = generatePosterWithOpenAI(prompt, assets, command.data);
  const saved = savePosterToDrive(image, command.data, match.manifest);
  sendWhatsAppImage(sender, saved);

  logEvent_("poster_generated", {
    sender: sender,
    messageId: messageId,
    product: command.data.product,
    outputFileId: saved.fileId
  });

  return { ok: true, fileId: saved.fileId };
}

