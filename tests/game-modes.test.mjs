import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("les catégories et la finale utilisent des réponses ouvertes", async () => {
  const multiplayer = await readFile(new URL("../app/multiplayer-game.tsx", import.meta.url), "utf8");
  assert.match(multiplayer, /RÉPONSE OUVERTE/);
  assert.match(multiplayer, /answerText/);
  assert.doesNotMatch(multiplayer, /category-answer[^\n]+answerIndex/);
});

test("le salon propose un animateur sur un ou plusieurs téléphones", async () => {
  const game = await readFile(new URL("../app/game.tsx", import.meta.url), "utf8");
  const room = await readFile(new URL("../app/firebase-room.ts", import.meta.url), "utf8");
  assert.match(game, /MODE ANIMATEUR/);
  assert.match(game, /UN SEUL TÉLÉPHONE/);
  assert.match(game, /PLUSIEURS TÉLÉPHONES/);
  assert.match(room, /answer-verdict/);
  assert.match(room, /isAnimator/);
});
