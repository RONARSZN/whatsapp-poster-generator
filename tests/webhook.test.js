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
  const replies = [];
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
    sendMessage: async (to, text) => {
      replies.push({ to, text });
    },
    sendImage: async () => {}
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body, "EVENT_RECEIVED");
  assert.equal(replies[0].text, "Got your poster request. Generating it now. Please wait for the poster reply.");
  assert.match(replies[1].text, /Error code: WP-101/);
});

test("POST sends an error code for invalid commands", async () => {
  const replies = [];
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
                    id: "msg-2",
                    from: "639171234567",
                    type: "text",
                    text: { body: "hello" }
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
      throw new Error("Pipeline should not run for invalid commands.");
    },
    sendMessage: async (to, text) => {
      replies.push({ to, text });
    },
    sendImage: async () => {}
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body, "EVENT_RECEIVED");
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /Error code: WP-001/);
});

test("POST blocks unapproved senders when an allowlist is configured", async () => {
  process.env.APPROVED_WHATSAPP_SENDERS = "639170000000,639180000000";
  const replies = [];
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
                    id: "msg-3",
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
      throw new Error("Pipeline should not run for unapproved senders.");
    },
    sendMessage: async (to, text) => {
      replies.push({ to, text });
    },
    sendImage: async () => {}
  });

  delete process.env.APPROVED_WHATSAPP_SENDERS;

  assert.equal(res.statusCode, 200);
  assert.equal(res.body, "EVENT_RECEIVED");
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /not approved/i);
});

test("POST returns a text brief instead of image generation for Canva mode", async () => {
  const replies = [];
  const images = [];
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
                    id: "msg-4",
                    from: "639171234567",
                    type: "text",
                    text: { body: 'poster wakepark day pass promo portrait mode=canva peg="bold sports layout"' }
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
      throw new Error("Image pipeline should not run for Canva mode.");
    },
    sendMessage: async (to, text) => {
      replies.push({ to, text });
    },
    sendImage: async (to, imageUrl) => {
      images.push({ to, imageUrl });
    }
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body, "EVENT_RECEIVED");
  assert.equal(images.length, 0);
  assert.match(replies[0].text, /Got your Canva brief request/);
  assert.match(replies[1].text, /Canva poster brief ready/);
  assert.match(replies[1].text, /Peg: bold sports layout/);
});
