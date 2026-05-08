function sendWhatsAppText(to, message) {
  return sendWhatsAppPayload_({
    messaging_product: "whatsapp",
    to: to,
    type: "text",
    text: { body: message }
  });
}

function sendWhatsAppImage(to, savedFile) {
  const mediaId = uploadWhatsAppMedia_(savedFile.blob);
  return sendWhatsAppPayload_({
    messaging_product: "whatsapp",
    to: to,
    type: "image",
    image: {
      id: mediaId,
      caption: "Generated poster"
    }
  });
}

function uploadWhatsAppMedia_(blob) {
  const cfg = getConfig_();
  const token = requireConfigValue_("WHATSAPP_ACCESS_TOKEN", cfg.whatsappAccessToken);
  const phoneId = requireConfigValue_("WHATSAPP_PHONE_NUMBER_ID", cfg.whatsappPhoneNumberId);
  const url = "https://graph.facebook.com/v21.0/" + phoneId + "/media";

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    headers: { Authorization: "Bearer " + token },
    payload: {
      messaging_product: "whatsapp",
      type: "image/png",
      file: blob
    },
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  const text = response.getContentText();
  if (status < 200 || status >= 300) {
    throw new Error("WhatsApp media upload failed: " + text);
  }

  const body = JSON.parse(text);
  if (!body.id) {
    throw new Error("WhatsApp media upload did not return a media ID.");
  }

  return body.id;
}

function sendWhatsAppPayload_(payload) {
  const cfg = getConfig_();
  const token = requireConfigValue_("WHATSAPP_ACCESS_TOKEN", cfg.whatsappAccessToken);
  const phoneId = requireConfigValue_("WHATSAPP_PHONE_NUMBER_ID", cfg.whatsappPhoneNumberId);
  const url = "https://graph.facebook.com/v21.0/" + phoneId + "/messages";

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error("WhatsApp send failed: " + response.getContentText());
  }

  return JSON.parse(response.getContentText());
}
