import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { problemsTable, testCasesTable, usersTable } from "@workspace/db";

export async function seedByteDock() {
  const existing = await db.select({ id: usersTable.id }).from(usersTable).limit(1);
  if (existing.length) return;

  const now = new Date();
  const adminId = randomUUID();
  const staffId = randomUUID();
  const studentId = randomUUID();
  await db.insert(usersTable).values([
    { id: adminId, name: "Avery Chen", email: "admin@bytedock.dev", passwordHash: await bcrypt.hash("ByteDock123!", 10), role: "admin" },
    { id: staffId, name: "Morgan Patel", email: "staff@bytedock.dev", passwordHash: await bcrypt.hash("ByteDock123!", 10), role: "staff" },
    { id: studentId, name: "Jordan Lee", email: "student@bytedock.dev", passwordHash: await bcrypt.hash("ByteDock123!", 10), role: "student" },
  ]);

  const firstProblem = randomUUID();
  const secondProblem = randomUUID();
  await db.insert(problemsTable).values([
    { id: firstProblem, title: "Two Sum", slug: "two-sum", category: "Arrays", difficulty: "easy", description: "Given an array of integers and a target, return the indices of the two numbers that add up to the target.", starterCode: "def two_sum(nums, target):\n    # Write your solution here\n    pass", status: "published", createdBy: adminId, createdAt: now, updatedAt: now },
    { id: secondProblem, title: "Balanced Brackets", slug: "balanced-brackets", category: "Stack", difficulty: "medium", description: "Determine whether every opening bracket is closed in the correct order.", starterCode: "def is_balanced(value):\n    # Write your solution here\n    pass", status: "published", createdBy: adminId, createdAt: now, updatedAt: now },
  ]);
  await db.insert(testCasesTable).values([
    { id: randomUUID(), problemId: firstProblem, input: "[2, 7, 11, 15]\n9", expectedOutput: "[0, 1]", isSample: "true" },
    { id: randomUUID(), problemId: firstProblem, input: "[3, 2, 4]\n6", expectedOutput: "[1, 2]", isSample: "false" },
    { id: randomUUID(), problemId: secondProblem, input: "([])", expectedOutput: "True", isSample: "true" },
    { id: randomUUID(), problemId: secondProblem, input: "([)]", expectedOutput: "False", isSample: "false" },
  ]);
  await db.update(usersTable).set({ updatedAt: now }).where(eq(usersTable.id, studentId));
}