import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  status: text("status").notNull().default("lobby"),
  hostPlayerId: text("host_player_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  startedAt: text("started_at"),
  phase: text("phase").notNull().default("lobby"),
  turnIndex: integer("turn_index").notNull().default(0),
  round: integer("round").notNull().default(1),
  currentTheme: text("current_theme"),
  usedThemes: text("used_themes").notNull().default("[]"),
  selectedCases: text("selected_cases").notNull().default("[]"),
  activeCase: integer("active_case"),
  phaseStartedAt: text("phase_started_at"),
});

export const roomPlayers = sqliteTable("room_players", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#8b5cf6"),
  ready: integer("ready", { mode: "boolean" }).notNull().default(false),
  score: integer("score").notNull().default(0),
  qualificationAnswered: integer("qualification_answered").notNull().default(0),
  qualificationMs: integer("qualification_ms").notNull().default(0),
  estimate: integer("estimate"),
  categoryScore: integer("category_score").notNull().default(0),
  categoryAnswered: integer("category_answered").notNull().default(0),
  finalScore: integer("final_score").notNull().default(0),
  joinedAt: text("joined_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const gameAnswers = sqliteTable("game_answers", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  playerId: text("player_id").notNull().references(() => roomPlayers.id, { onDelete: "cascade" }),
  phase: text("phase").notNull(),
  questionKey: text("question_key").notNull(),
  answerIndex: integer("answer_index").notNull(),
  correct: integer("correct", { mode: "boolean" }).notNull().default(false),
  responseMs: integer("response_ms").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  uniqueAnswer: uniqueIndex("game_answers_unique").on(table.roomId, table.playerId, table.phase, table.questionKey),
}));
