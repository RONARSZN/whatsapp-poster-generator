import assert from "node:assert/strict";
import test from "node:test";

import handler from "../api/webhook.js";

/**
 * Create a tiny response double that behaves like Vercel's response object.
 * @returns {object} Test response object.
 */
function createResponse() {
  return {
    statusCode: 200,
    body: "",
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
    },
    send(value) {
      this.body = value;
      return this;
    },
    json(value) {
      this.body = JSON.stringify(value);
      return this;
    },
    end(value = "") {
      this.body = value;
      return this;
    }
  };
}

test("GET verifies Meta challenge when token matches", async () => {
  process.env.WHATSAPP_VERIFY_TOKEN = "verify-me";
  const req = {
    method: "GET",
    query: {
      "hub.verify_token": "verify-me",
      "hub.challenge": "challenge-123"
    }
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body, "challenge-123");
});

test("GET rejects Meta verification when token differs", async () => {
  process.env.WHATSAPP_VERIFY_TOKEN = "verify-me";
  const req = {
    method: "GET",
    query: {
      "hub.verify_token": "wrong",
      "hub.challenge": "challenge-123"
    }
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 403);
});

test("POST always returns 200 when the poster pipeline fails", async () => {
  const req = {
    method: "POST",
    body: {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: "msg-1",
                    from: "639171234567",
                    type: "text",
                    text: { body: "poster wakepark day pass promo portrait" }
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  };
  const res = createResponse();

  await handler(req, res, {
    runPosterPipeline: async () => {
      throw new Error("pipeline down");
    },
    sendMessage: async () => {},
    sendImage: async () => {}
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body, "EVENT_RECEIVED");
});
