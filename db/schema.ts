import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const aiQuota = sqliteTable("ai_quota", {
  key: text("key").primaryKey(),
  bucket: integer("bucket").notNull(),
  count: integer("count").notNull(),
});
