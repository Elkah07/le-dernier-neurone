import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  status: text("status").notNull().default("lobby"),
  hostPlayerId: text("host_player_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  startedAt: text("started_at"),
});

export const roomPlayers = sqliteTable("room_players", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#8b5cf6"),
  ready: integer("ready", { mode: "boolean" }).notNull().default(false),
  score: integer("score").notNull().default(0),
  joinedAt: text("joined_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
