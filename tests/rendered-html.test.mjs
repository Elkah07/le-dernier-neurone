import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("génère une PWA statique sans authentification ChatGPT", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  const manifest = JSON.parse(await readFile(new URL("../dist/manifest.webmanifest", import.meta.url), "utf8"));
  await readFile(new URL("../dist/sw.js", import.meta.url), "utf8");
  assert.match(html, /Le Dernier Neurone/i);
  assert.doesNotMatch(html, /codex-preview|signin-with-chatgpt/i);
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
});
