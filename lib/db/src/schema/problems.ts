import { createInsertSchema } from "drizzle-zod";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const problemsTable = pgTable("problems", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull(),
  description: text("description").notNull(),
  starterCode: text("starter_code").notNull(),
  status: text("status").notNull().default("draft"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const testCasesTable = pgTable("test_cases", {
  id: text("id").primaryKey(),
  problemId: text("problem_id").notNull(),
  input: text("input").notNull(),
  expectedOutput: text("expected_output").notNull(),
  isSample: text("is_sample").notNull().default("false"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProblemSchema = createInsertSchema(problemsTable).omit({ createdAt: true, updatedAt: true });
export const insertTestCaseSchema = createInsertSchema(testCasesTable).omit({ createdAt: true });
export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type InsertTestCase = z.infer<typeof insertTestCaseSchema>;
export type Problem = typeof problemsTable.$inferSelect;
export type TestCase = typeof testCasesTable.$inferSelect;