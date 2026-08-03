import assert from "node:assert/strict";
import test from "node:test";
import bank from "../data/question-bank.json" with { type: "json" };

test("la base contient exactement 1 080 QCM valides", () => {
  assert.equal(bank.length, 1080);
  assert.equal(new Set(bank.map(question => question.question.toLowerCase())).size, 1080);
  for (const question of bank) {
    assert.match(question.question, /\?["»']?$/);
    assert.equal(question.choices.length, 4);
    assert.equal(new Set(question.choices.map(choice => choice.toLowerCase())).size, 4);
    assert.ok(question.answer >= 0 && question.answer <= 3);
    assert.ok(question.choices[question.answer]);
  }
});

test("tous les thèmes demandés sont représentés", () => {
  for (const category of ["Cinéma", "Musique", "Gaming", "Disney", "Marvel", "Années 90/2000", "Téléréalité", "YouTube/Twitch", "Netflix/Séries", "Cuisine"]) {
    assert.ok(bank.some(question => question.category === category), `thème manquant: ${category}`);
  }
});

test("les métadonnées éditoriales sont reconnues", () => {
  const difficulties = new Set(["easy", "medium", "hard"]);
  for (const question of bank) {
    assert.ok(question.id && typeof question.id === "string");
    assert.ok(question.category && typeof question.category === "string");
    assert.ok(difficulties.has(question.difficulty), `difficulté inconnue: ${question.difficulty}`);
    assert.ok(question.choices.every(choice => choice.trim().length > 0));
  }
});
