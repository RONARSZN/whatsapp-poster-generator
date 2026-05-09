import { parsePosterCommand } from "../lib/parser.js";
import { buildPosterModeReply, runPosterPipeline } from "../lib/poster.js";
import { sendImage, sendMessage } from "../lib/whatsapp.js";

const ACK_MESSAGE = "Got your poster request. Generating it now. Please wait for the poster reply.";
const ERROR_CODES = {
  INVALID_COMMAND: "WP-001",
  POSTER_GENERATION_FAILED: "WP-101",
  IMAGE_SEND_FAILED: "WP-201"
};

/**
 * Vercel serverless webhook handler for Meta WhatsApp Cloud API.
 * @param {object} req Vercel request.
 * @param {object} res Vercel response.
 * @param {object} deps Optional test dependency overrides.
 * @returns {Promise<void>} Completes the HTTP response.
 */
export default async function handler(req, res, deps = {}) {
  try {
    if (req.method === "GET") {
      return handleGet(req, res);
    }

    if (req.method === "POST") {
      return await handlePost(req, res, {
        runPosterPipeline: deps.runPosterPipeline || runPosterPipeline,
        sendMessage: deps.sendMessage || sendMessage,
        sendImage: deps.sendImage || sendImage
      });
    }

    return sendResponse(res, 405, "Method Not Allowed");
  } catch (error) {
    console.log(JSON.stringify({ type: "webhook_handler_failed", message: error.message }));
    return sendResponse(res, 200, "EVENT_RECEIVED");
  }
}

/**
 * Handle Meta webhook verification.
 * @param {object} req Request.
 * @param {object} res Response.
 * @returns {void}
 */
export function handleGet(req, res) {
  const query = req.query || {};
  const token = query["hub.verify_token"];
  const challenge = query["hub.challenge"];

  if (token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return sendResponse(res, 200, String(challenge || ""));
  }

  return sendResponse(res, 403, "Forbidden");
}

/**
 * Handle incoming WhatsApp message notifications without leaking failures to Meta.
 * @param {object} req Request.
 * @param {object} res Response.
 * @param {object} deps Runtime dependencies.
 * @returns {Promise<void>} Completes the HTTP response.
 */
export async function handlePost(req, res, deps) {
  try {
    const payload = parseRequestBody(req.body);
    const message = extractWhatsAppMessage(payload);
    if (!message) {
      return sendResponse(res, 200, "EVENT_RECEIVED");
    }

    if (!isApprovedSender(message.from)) {
      await safeSendMessage(deps, message.from, "This number is not approved to use the poster generator.");
      return sendResponse(res, 200, "EVENT_RECEIVED");
    }

    const parsed = parsePosterCommand(message.text);
    if (!parsed.ok) {
      await safeSendMessage(deps, message.from, formatErrorReply(ERROR_CODES.INVALID_COMMAND, parsed.error));
      return sendResponse(res, 200, "EVENT_RECEIVED");
    }

    await safeSendMessage(deps, message.from, formatAckMessage(parsed.data.mode));

    try {
      if (parsed.data.mode !== "template") {
        const reply = await buildPosterModeReply(parsed.data);
        await safeSendMessage(deps, message.from, reply);
        return sendResponse(res, 200, "EVENT_RECEIVED");
      }

      const result = await deps.runPosterPipeline(parsed.data);
      if (isFailureMessage(result)) {
        await safeSendMessage(deps, message.from, formatErrorReply(ERROR_CODES.POSTER_GENERATION_FAILED, result));
      } else {
        await safeSendImage(deps, message.from, result, "Generated poster");
      }
    } catch (error) {
      console.log(JSON.stringify({ type: "webhook_pipeline_failed", message: error.message }));
      await safeSendMessage(
        deps,
        message.from,
        formatErrorReply(ERROR_CODES.POSTER_GENERATION_FAILED, "Poster generation failed. Please try again or contact the team.")
      );
    }
  } catch (error) {
    console.log(JSON.stringify({ type: "webhook_post_failed", message: error.message }));
  }

  return sendResponse(res, 200, "EVENT_RECEIVED");
}

/**
 * Extract the first text WhatsApp message from a Meta webhook payload.
 * @param {object} payload Meta webhook payload.
 * @returns {{id: string, from: string, text: string} | null} Message or null.
 */
export function extractWhatsAppMessage(payload) {
  const value = payload?.entry?.[0]?.changes?.[0]?.value;
  const msg = value?.messages?.[0];
  if (!msg || msg.type !== "text") {
    return null;
  }

  return {
    id: msg.id,
    from: msg.from,
    text: msg.text?.body || ""
  };
}

/**
 * Parse a Vercel request body that may already be an object or a string.
 * @param {object|string|Buffer} body Request body.
 * @returns {object} Parsed body.
 */
export function parseRequestBody(body) {
  if (!body) return {};
  if (Buffer.isBuffer(body)) return JSON.parse(body.toString("utf8"));
  if (typeof body === "string") return JSON.parse(body);
  return body;
}

/**
 * Check an optional comma-separated sender allowlist.
 * @param {string} sender WhatsApp sender number.
 * @returns {boolean} True when no allowlist exists or the sender is listed.
 */
function isApprovedSender(sender) {
  const approved = String(process.env.APPROVED_WHATSAPP_SENDERS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!approved.length) return true;

  const normalizedSender = normalizePhone(sender);
  return approved.some((value) => normalizePhone(value) === normalizedSender);
}

/**
 * Normalize phone numbers for allowlist checks.
 * @param {string} value Phone number value.
 * @returns {string} Digits-only phone number.
 */
function normalizePhone(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

/**
 * Send a WhatsApp text reply while keeping webhook failures contained.
 * @param {object} deps Runtime dependencies.
 * @param {string} to Recipient number.
 * @param {string} text Reply text.
 * @returns {Promise<void>} Completes after send attempt.
 */
async function safeSendMessage(deps, to, text) {
  try {
    await deps.sendMessage(to, text);
  } catch (error) {
    console.log(JSON.stringify({ type: "whatsapp_text_failed", message: error.message }));
  }
}

/**
 * Send a WhatsApp image reply and fall back to a text URL if image send fails.
 * @param {object} deps Runtime dependencies.
 * @param {string} to Recipient number.
 * @param {string} imageUrl Public image URL.
 * @param {string} caption Image caption.
 * @returns {Promise<void>} Completes after send attempt.
 */
async function safeSendImage(deps, to, imageUrl, caption) {
  try {
    await deps.sendImage(to, imageUrl, caption);
  } catch (error) {
    console.log(JSON.stringify({ type: "whatsapp_image_failed", message: error.message }));
    await safeSendMessage(deps, to, formatErrorReply(ERROR_CODES.IMAGE_SEND_FAILED, `Image send failed. Poster URL: ${imageUrl}`));
  }
}

/**
 * Format a user-facing WhatsApp error reply with a stable support code.
 * @param {string} code Stable error code.
 * @param {string} message Human-readable message.
 * @returns {string} Error reply.
 */
function formatErrorReply(code, message) {
  return `${message}\n\nError code: ${code}`;
}

/**
 * Check whether a pipeline result is the user-facing failure message.
 * @param {string} value Pipeline result.
 * @returns {boolean} True when the result is a failure message.
 */
function isFailureMessage(value) {
  return String(value || "").startsWith("Poster generation failed.");
}

/**
 * Return an accurate acknowledgment for the selected workflow mode.
 * @param {string} mode Parsed poster mode.
 * @returns {string} WhatsApp acknowledgment text.
 */
function formatAckMessage(mode) {
  if (mode === "canva") {
    return "Got your Canva brief request. Preparing it now.";
  }

  if (mode === "local") {
    return "Got your validation request. Checking it now.";
  }

  return ACK_MESSAGE;
}

/**
 * Send a plain text response across Vercel-style and test response objects.
 * @param {object} res Response object.
 * @param {number} statusCode HTTP status code.
 * @param {string} body Response body.
 * @returns {unknown} Response send result.
 */
function sendResponse(res, statusCode, body) {
  if (typeof res.status === "function") {
    res.status(statusCode);
  } else {
    res.statusCode = statusCode;
  }

  if (typeof res.setHeader === "function") {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
  }

  if (typeof res.send === "function") {
    return res.send(body);
  }

  if (typeof res.end === "function") {
    return res.end(body);
  }

  res.body = body;
  return undefined;
}
