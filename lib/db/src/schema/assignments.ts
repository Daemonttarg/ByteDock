import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const staffAssignmentsTable = pgTable("staff_assignments", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull(),
  studentId: text("student_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});