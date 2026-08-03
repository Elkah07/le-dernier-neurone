import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("renders the production application metadata", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  assert.match(html, /<title>Le Dernier Neurone<\/title>/i);
  assert.match(
    html,
    /<meta(?=[^>]*\bname=["']description["'])(?=[^>]*\bcontent=["']Prouve qu.il t.en reste au moins un\.["'])[^>]*>/i,
  );
});
