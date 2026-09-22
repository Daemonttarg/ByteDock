import { createInsertSchema } from "drizzle-zod";
import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const submissionsTable = pgTable("submissions", {
  id: text("id").primaryKey(),
  problemId: text("problem_id").notNull(),
  studentId: text("student_id").notNull(),
  code: text("code").notNull(),
  status: text("status").notNull(),
  passedTests: integer("passed_tests").notNull().default(0),
  totalTests: integer("total_tests").notNull().default(0),
  runtimeMs: integer("runtime_ms").notNull().default(0),
  output: text("output").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSubmissionSchema = createInsertSchema(submissionsTable).omit({ createdAt: true });
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissionsTable.$inferSelect;