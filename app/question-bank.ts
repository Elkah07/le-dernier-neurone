import bank from "../data/question-bank.json";

export type GameQuestion = { id: string; q: string; choices: string[]; answer: number; category: string; difficulty: string };

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
