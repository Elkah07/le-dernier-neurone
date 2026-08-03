import bank from "../data/question-bank.json";

export type GameQuestion = { id: string; q: string; choices: string[]; answer: number; category: string; difficulty: string };

export function expectedAnswer(question: GameQuestion) {
  return question.choices[question.answer] || "";
}

export function normalizeOpenAnswer(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(monsieur|madame|mr|mme|le|la|les|l'|un|une|des)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function isAcceptedOpenAnswer(question: GameQuestion, value: string) {
  const given = normalizeOpenAnswer(value);
  const expected = normalizeOpenAnswer(expectedAnswer(question));
  if (!given || !expected) return false;
  if (given === expected) return true;
  const significant = (text: string) => text.split(" ").filter(part => part.length > 2);
  const expectedParts = significant(expected);
  const givenParts = significant(given);
  return expectedParts.length > 1 && givenParts.length > 0 && givenParts.every(part => expectedParts.includes(part));
}

export const allQuestions: GameQuestion[] = bank.map(item => ({
  id: item.id,
  q: item.question,
  choices: item.choices,
  answer: item.answer,
  category: item.category,
  difficulty: item.difficulty,
}));

function stableOrder(question: GameQuestion) {
  let hash = 2166136261;
  for (const character of question.id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

export const qualificationQuestions = [...allQuestions].sort((a, b) => stableOrder(a) - stableOrder(b)).slice(0, 20);

const categoryMapping: Record<string, string> = {
  "Cinéma": "Cinéma",
  "Musique": "Musique",
  "Gaming": "Gaming",
  "Disney": "Disney",
  "Marvel": "Marvel",
  "Années 90/2000": "Années 90/2000",
  "Téléréalité": "Téléréalité",
  "YouTube/Twitch": "YouTube/Twitch",
  "Netflix/Séries": "Netflix/Séries",
  "Cuisine": "Cuisine",
};

export const themeQuestions = Object.fromEntries(
  Object.entries(categoryMapping).map(([theme, category]) => [theme, allQuestions.filter(question => question.category === category)])
) as Record<string, GameQuestion[]>;
