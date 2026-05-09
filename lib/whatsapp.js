const GRAPH_VERSION = "v18.0";

/**
 * Send a plain text WhatsApp reply through Meta Cloud API.
 * @param {string} to Recipient WhatsApp number.
 * @param {string} text Reply text.
 * @returns {Promise<object>} Meta API response body.
 */
export async function sendMessage(to, text) {
  try {
    return await sendWhatsAppPayload({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text }
    });
  } catch (error) {
    console.log(JSON.stringify({ type: "whatsapp_send_message_failed", message: error.message }));
    throw error;
  }
}

/**
 * Send an image WhatsApp reply by public URL.
 * @param {string} to Recipient WhatsApp number.
 * @param {string} imageUrl Public image URL.
 * @param {string} caption Image caption.
 * @returns {Promise<object>} Meta API response body.
 */
export async function sendImage(to, imageUrl, caption = "Generated poster") {
  try {
    return await sendWhatsAppPayload({
      messaging_product: "whatsapp",
      to,
      type: "image",
      image: {
        link: imageUrl,
        caption
      }
    });
  } catch (error) {
    console.log(JSON.stringify({ type: "whatsapp_send_image_failed", message: error.message }));
    throw error;
  }
}

/**
 * Send a raw WhatsApp Cloud API message payload.
 * @param {object} payload Meta messages payload.
 * @returns {Promise<object>} Meta API response body.
 */
export async function sendWhatsAppPayload(payload) {
  try {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token) throw new Error("Missing WHATSAPP_TOKEN.");
    if (!phoneNumberId) throw new Error("Missing WHATSAPP_PHONE_NUMBER_ID.");

    const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(`WhatsApp send failed: ${body}`);
    }

    return body ? JSON.parse(body) : {};
  } catch (error) {
    console.log(JSON.stringify({ type: "whatsapp_payload_failed", message: error.message }));
    throw error;
  }
}
