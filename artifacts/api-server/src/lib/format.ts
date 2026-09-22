import type { Problem, TestCase, User } from "@workspace/db";

export function publicUser(user: User) {
  return { id: user.id, name: user.name, email: user.email, role: user.role as "admin" | "staff" | "student", avatar: user.avatar ?? null };
}

export function formatTestCase(testCase: TestCase) {
  return { id: testCase.id, input: testCase.input, expectedOutput: testCase.expectedOutput, isSample: testCase.isSample === "true" };
}

export function formatProblem(problem: Problem, testCases: TestCase[], solveCount = 0, acceptanceRate = 0) {
  return {
    id: problem.id, title: problem.title, slug: problem.slug, difficulty: problem.difficulty as "easy" | "medium" | "hard",
    category: problem.category, description: problem.description, starterCode: problem.starterCode,
    status: problem.status as "draft" | "published" | "archived", acceptanceRate, solveCount,
    testCases: testCases.map(formatTestCase), createdAt: problem.createdAt.toISOString(),
  };
}