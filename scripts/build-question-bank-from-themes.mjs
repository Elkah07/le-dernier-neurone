import fs from "node:fs";
import path from "node:path";

const themesDir = "data/questions-par-theme";
const output = "data/question-bank.json";
const files = fs.readdirSync(themesDir).filter(file => file.endsWith(".json")).sort();
const questions = files.flatMap(file => JSON.parse(fs.readFileSync(path.join(themesDir, file), "utf8")));
const included = questions.filter(question => question.validation !== "rejetee");

const stableHash = value => [...value].reduce(
  (total, character) => Math.imul(total ^ character.charCodeAt(0), 16777619) >>> 0,
  2166136261,
);

for (const question of included) {
  const correctChoice = question.choices[question.answer];
  question.choices = [...question.choices].sort(
    (a, b) => stableHash(`${question.id}:${a}`) - stableHash(`${question.id}:${b}`),
  );
  question.answer = question.choices.indexOf(correctChoice);
}

const ids = new Set();
const texts = new Set();
for (const question of included) {
  if (!question.id || ids.has(question.id)) throw new Error(`Identifiant absent ou en double : ${question.id}`);
  ids.add(question.id);
  const normalized = question.question.toLocaleLowerCase("fr").trim();
  if (texts.has(normalized)) throw new Error(`Question en double : ${question.question}`);
  texts.add(normalized);
  if (!Array.isArray(question.choices) || question.choices.length !== 4) throw new Error(`Il faut 4 choix : ${question.id}`);
  if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) throw new Error(`Bonne réponse invalide : ${question.id}`);
}

fs.writeFileSync(output, `${JSON.stringify(included, null, 2)}\n`);
console.log(`${included.length} questions actives générées depuis ${files.length} thèmes.`);
