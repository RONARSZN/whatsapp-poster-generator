import assert from "node:assert/strict";
import test from "node:test";

import {
  applyManifestDefaultsToCommand,
  parsePosterCommand
} from "../lib/parser.js";

test("parses peg notes without leaking quoted text into the offer", () => {
  const parsed = parsePosterCommand('poster wakepark day pass promo portrait peg="bold sports layout"');

  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.product, "wakepark");
  assert.equal(parsed.data.offer, "day pass promo");
  assert.equal(parsed.data.size, "1024x1536");
  assert.equal(parsed.data.mode, "template");
  assert.equal(parsed.data.pegNotes, "bold sports layout");
});

test("keeps canva and local as supported poster modes", () => {
  assert.equal(parsePosterCommand("poster wakepark weekend promo mode=canva").data.mode, "canva");
  assert.equal(parsePosterCommand("poster wakepark test promo mode=local").data.mode, "local");
  assert.equal(parsePosterCommand("poster wakepark test promo mode=test").data.mode, "local");
});

test("applies manifest defaults after multi-word alias matching", () => {
  const command = parsePosterCommand("poster pro shop summer sale portrait").data;
  const manifest = {
    product: "proshop",
    defaultCta: "Shop the gear"
  };

  applyManifestDefaultsToCommand(command, manifest, "pro shop");

  assert.equal(command.product, "proshop");
  assert.equal(command.offer, "summer sale");
  assert.equal(command.cta, "Shop the gear");
});

test("returns a useful error for non-poster commands", () => {
  const parsed = parsePosterCommand("hello");

  assert.equal(parsed.ok, false);
  assert.match(parsed.error, /Use: poster product offer size/);
});
