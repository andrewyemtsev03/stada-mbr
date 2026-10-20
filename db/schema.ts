// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
export const rooms = sqliteTable("rooms", {
  code: text("code").primaryKey(), host: text("host").notNull(),
  phase: text("phase").notNull().default("lobby"),
  round: integer("round").notNull().default(0),
  deadline: integer("deadline").notNull().default(0),
  created: integer("created").notNull(),
});
export const players = sqliteTable("players", {
  token: text("token").primaryKey(), room: text("room").notNull(),
  name: text("name").notNull(), joined: integer("joined").notNull(),
});
export const answers = sqliteTable("answers", {
  player: text("player").notNull(), room: text("room").notNull(),
  round: integer("round").notNull(), choice: integer("choice").notNull(),
  points: integer("points").notNull(),
}, t => [primaryKey({columns:[t.player,t.round]})]);
