import { Router, type IRouter, type Request } from "express";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, problemsTable, submissionsTable, testCasesTable, usersTable } from "@workspace/db";
import {
  AddTestCaseBody, AddTestCaseParams, CreateProblemBody, CreateSubmissionBody, DeleteProblemParams,
  ExecuteCodeBody, GetProblemParams, GetStudentAnalyticsParams, GetSubmissionParams, ListProblemsQueryParams,
  ListSubmissionsQueryParams, LoginBody, PublishProblemParams, UpdateProblemBody, UpdateProblemParams,
  CreateProblemResponse, GetProblemResponse, UpdateProblemResponse, DeleteProblemResponse, PublishProblemResponse,
  AddTestCaseResponse, ExecuteCodeResponse, CreateSubmissionResponse, GetSubmissionResponse, ListProblemsResponse,
  ListSubmissionsResponse, ListStudentsResponse, GetStudentAnalyticsResponse, GetProgressResponse,
  GetDashboardSummaryResponse, ListActivityResponse,
} from "@workspace/api-zod";
import { currentUser, requireAuth, requireRoles } from "../middleware/auth";
import { formatProblem, formatTestCase } from "../lib/format";

const router: IRouter = Router();

function countValue(row: { count: unknown } | undefined) {
  return Number(row?.count ?? 0);
}

async function problemWithCases(id: string) {
  const problem = (await db.select().from(problemsTable).where(eq(problemsTable.id, id)).limit(1))[0];
  if (!problem) return undefined;
  const cases = await db.select().from(testCasesTable).where(eq(testCasesTable.problemId, id));
  const total = await db.select({ count: sql<number>`count(*)` }).from(submissionsTable).where(eq(submissionsTable.problemId, id));
  const accepted = await db.select({ count: sql<number>`count(*)` }).from(submissionsTable).where(and(eq(submissionsTable.problemId, id), eq(submissionsTable.status, "accepted")));
  return formatProblem(problem, cases, countValue(accepted[0]), countValue(total[0]) ? (countValue(accepted[0]) / countValue(total[0])) * 100 : 0);
}

async function listFormattedProblems(query: { search?: string; difficulty?: string; status?: string }) {
  const conditions = [];
  if (query.search) conditions.push(ilike(problemsTable.title, `%${query.search}%`));
  if (query.difficulty) conditions.push(eq(problemsTable.difficulty, query.difficulty));
  if (query.status) conditions.push(eq(problemsTable.status, query.status));
  const problems = await db.select().from(problemsTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(problemsTable.createdAt));
  return Promise.all(problems.map(async (problem) => (await problemWithCases(problem.id))!));
}

async function runPiston(code: string, stdin: string) {
  const response = await fetch("https://emkc.org/api/v2/piston/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language: "python", version: "3.10.0", files: [{ name: "main.py", content: code }], stdin }),
  });
  if (!response.ok) throw new Error(`Execution service returned ${response.status}`);
  const payload = await response.json() as { run?: { output?: string; stderr?: string; code?: number | null } };
  return payload.run ?? {};
}

async function judge(problemId: string, code: string) {
  const cases = await db.select().from(testCasesTable).where(eq(testCasesTable.problemId, problemId));
  const started = Date.now();
  const testResults: Array<{ testCaseId: string; passed: boolean; actual: string; expected: string }> = [];
  let output = "";
  for (const testCase of cases) {
    const result = await runPiston(code, testCase.input);
    const actual = (result.output ?? result.stderr ?? "").trim();
    const expected = testCase.expectedOutput.trim();
    output = actual || result.stderr || "";
    testResults.push({ testCaseId: testCase.id, passed: !result.stderr && actual === expected, actual, expected });
    if (result.stderr) break;
  }
  const passed = testResults.filter((result) => result.passed).length;
  const hasError = testResults.some((result) => result.actual && !result.passed && result.expected !== result.actual && output.includes("Traceback"));
  return {
    status: hasError ? "error" as const : passed === cases.length ? "passed" as const : "failed" as const,
    passed, total: cases.length, runtimeMs: Date.now() - started, output, testResults,
  };
}

router.get("/dashboard/summary", requireAuth, async (req, res) => {
  const user = currentUser(req)!;
  const [studentCount, staffCount, problemCount, publishedCount, submissionCount, acceptedCount, activeCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.role, "student")),
    db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.role, "staff")),
    db.select({ count: sql<number>`count(*)` }).from(problemsTable),
    db.select({ count: sql<number>`count(*)` }).from(problemsTable).where(eq(problemsTable.status, "published")),
    db.select({ count: sql<number>`count(*)` }).from(submissionsTable),
    db.select({ count: sql<number>`count(*)` }).from(submissionsTable).where(eq(submissionsTable.status, "accepted")),
    db.select({ count: sql<number>`count(distinct student_id)` }).from(submissionsTable),
  ]);
  const recent = await recentActivity();
  const summary = {
    role: user.role, totalStudents: countValue(studentCount[0]), totalStaff: countValue(staffCount[0]),
    totalProblems: countValue(problemCount[0]), publishedProblems: countValue(publishedCount[0]),
    totalSubmissions: countValue(submissionCount[0]), acceptedSubmissions: countValue(acceptedCount[0]),
    activeStudents: countValue(activeCount[0]), solvedCount: user.role === "student" ? await solvedCountFor(user.id) : countValue(acceptedCount[0]),
    completionPercent: countValue(publishedCount[0]) ? ((user.role === "student" ? await solvedCountFor(user.id) : countValue(acceptedCount[0])) / countValue(publishedCount[0])) * 100 : 0,
    recentActivity: recent, weeklySubmissions: await weeklySubmissionMetrics(),
  };
  return res.json(GetDashboardSummaryResponse.parse(summary));
});

router.get("/problems", async (req, res) => {
  const query = ListProblemsQueryParams.parse(req.query);
  const formatted = await listFormattedProblems(query);
  return res.json(ListProblemsResponse.parse(formatted));
});

router.post("/problems", requireAuth, requireRoles("admin"), async (req, res) => {
  const input = CreateProblemBody.parse(req.body);
  const user = currentUser(req)!;
  const problem = (await db.insert(problemsTable).values({
    id: randomUUID(), title: input.title, slug: `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`,
    category: input.category, difficulty: input.difficulty, description: input.description, starterCode: input.starterCode,
    status: input.status ?? "draft", createdBy: user.id,
  }).returning())[0];
  return res.status(201).json(CreateProblemResponse.parse(await problemWithCases(problem.id)));
});

router.get("/problems/:id", async (req, res) => {
  const params = GetProblemParams.parse(req.params);
  const problem = await problemWithCases(params.id);
  if (!problem) return res.status(404).json({ error: "Problem not found" });
  return res.json(GetProblemResponse.parse(problem));
});

router.patch("/problems/:id", requireAuth, requireRoles("admin"), async (req, res) => {
  const params = UpdateProblemParams.parse(req.params);
  const input = UpdateProblemBody.parse(req.body);
  const problem = (await db.update(problemsTable).set({ ...input, updatedAt: new Date() }).where(eq(problemsTable.id, params.id)).returning())[0];
  if (!problem) return res.status(404).json({ error: "Problem not found" });
  return res.json(UpdateProblemResponse.parse(await problemWithCases(problem.id)));
});

router.delete("/problems/:id", requireAuth, requireRoles("admin"), async (req, res) => {
  const params = DeleteProblemParams.parse(req.params);
  await db.delete(testCasesTable).where(eq(testCasesTable.problemId, params.id));
  const deleted = await db.delete(problemsTable).where(eq(problemsTable.id, params.id)).returning({ id: problemsTable.id });
  if (!deleted.length) return res.status(404).json({ error: "Problem not found" });
  return res.status(204).send();
});

router.post("/problems/:id", requireAuth, requireRoles("admin"), async (req, res) => {
  const params = PublishProblemParams.parse(req.params);
  const problem = (await db.update(problemsTable).set({ status: "published", updatedAt: new Date() }).where(eq(problemsTable.id, params.id)).returning())[0];
  if (!problem) return res.status(404).json({ error: "Problem not found" });
  return res.json(PublishProblemResponse.parse(await problemWithCases(problem.id)));
});

router.post("/problems/:id/test-cases", requireAuth, requireRoles("admin"), async (req, res) => {
  const params = AddTestCaseParams.parse(req.params);
  const input = AddTestCaseBody.parse(req.body);
  const testCase = (await db.insert(testCasesTable).values({ id: randomUUID(), problemId: params.id, input: input.input, expectedOutput: input.expectedOutput, isSample: input.isSample ? "true" : "false" }).returning())[0];
  return res.status(201).json(AddTestCaseResponse.parse(formatTestCase(testCase)));
});

router.post("/execute", requireAuth, requireRoles("student"), async (req, res) => {
  const input = ExecuteCodeBody.parse(req.body);
  const result = await judge(input.problemId, input.code);
  return res.json(ExecuteCodeResponse.parse(result));
});

router.get("/submissions", requireAuth, async (req, res) => {
  const input = ListSubmissionsQueryParams.parse(req.query);
  const user = currentUser(req)!;
  const conditions = [];
  if (user.role === "student") conditions.push(eq(submissionsTable.studentId, user.id));
  else if (input.studentId) conditions.push(eq(submissionsTable.studentId, input.studentId));
  if (input.problemId) conditions.push(eq(submissionsTable.problemId, input.problemId));
  const rows = await db.select({ submission: submissionsTable, problemTitle: problemsTable.title, studentName: usersTable.name })
    .from(submissionsTable).innerJoin(problemsTable, eq(problemsTable.id, submissionsTable.problemId)).innerJoin(usersTable, eq(usersTable.id, submissionsTable.studentId))
    .where(conditions.length ? and(...conditions) : undefined).orderBy(desc(submissionsTable.createdAt));
  return res.json(ListSubmissionsResponse.parse(rows.map(({ submission, problemTitle, studentName }) => formatSubmission(submission, problemTitle, studentName))));
});

router.post("/submissions", requireAuth, requireRoles("student"), async (req, res) => {
  const input = CreateSubmissionBody.parse(req.body);
  const user = currentUser(req)!;
  const problem = await problemWithCases(input.problemId);
  if (!problem) return res.status(404).json({ error: "Problem not found" });
  const result = await judge(input.problemId, input.code);
  const row = (await db.insert(submissionsTable).values({
    id: randomUUID(), problemId: input.problemId, studentId: user.id, code: input.code,
    status: result.status === "passed" ? "accepted" : result.status === "error" ? "error" : "rejected",
    passedTests: result.passed, totalTests: result.total, runtimeMs: result.runtimeMs, output: result.output,
  }).returning())[0];
  return res.status(201).json(CreateSubmissionResponse.parse(formatSubmission(row, problem.title, user.name)));
});

router.get("/submissions/:id", requireAuth, async (req, res) => {
  const params = GetSubmissionParams.parse(req.params);
  const user = currentUser(req)!;
  const rows = await db.select({ submission: submissionsTable, problemTitle: problemsTable.title, studentName: usersTable.name })
    .from(submissionsTable).innerJoin(problemsTable, eq(problemsTable.id, submissionsTable.problemId)).innerJoin(usersTable, eq(usersTable.id, submissionsTable.studentId))
    .where(eq(submissionsTable.id, params.id)).limit(1);
  const row = rows[0];
  if (!row || (user.role === "student" && row.submission.studentId !== user.id)) return res.status(404).json({ error: "Submission not found" });
  return res.json(GetSubmissionResponse.parse(formatSubmission(row.submission, row.problemTitle, row.studentName)));
});

router.get("/students", requireAuth, requireRoles("admin", "staff"), async (_req, res) => {
  const students = await db.select().from(usersTable).where(eq(usersTable.role, "student")).orderBy(usersTable.name);
  const response = await Promise.all(students.map(async (student) => ({
    id: student.id, name: student.name, email: student.email,
    solvedCount: await solvedCountFor(student.id),
    submissionCount: countValue((await db.select({ count: sql<number>`count(*)` }).from(submissionsTable).where(eq(submissionsTable.studentId, student.id)))[0]),
    lastActiveAt: (await db.select({ createdAt: submissionsTable.createdAt }).from(submissionsTable).where(eq(submissionsTable.studentId, student.id)).orderBy(desc(submissionsTable.createdAt)).limit(1))[0]?.createdAt.toISOString() ?? null,
  })));
  return res.json(ListStudentsResponse.parse(response));
});

router.get("/students/:id/analytics", requireAuth, requireRoles("admin", "staff"), async (req, res) => {
  const params = GetStudentAnalyticsParams.parse(req.params);
  const student = (await db.select().from(usersTable).where(and(eq(usersTable.id, params.id), eq(usersTable.role, "student"))).limit(1))[0];
  if (!student) return res.status(404).json({ error: "Student not found" });
  const [all, accepted] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(submissionsTable).where(eq(submissionsTable.studentId, student.id)),
    db.select({ count: sql<number>`count(*)` }).from(submissionsTable).where(and(eq(submissionsTable.studentId, student.id), eq(submissionsTable.status, "accepted"))),
  ]);
  const submissions = await db.select({ submission: submissionsTable, problemTitle: problemsTable.title, studentName: usersTable.name })
    .from(submissionsTable).innerJoin(problemsTable, eq(problemsTable.id, submissionsTable.problemId)).innerJoin(usersTable, eq(usersTable.id, submissionsTable.studentId))
    .where(eq(submissionsTable.studentId, student.id)).orderBy(desc(submissionsTable.createdAt)).limit(8);
  const byDifficulty = await difficultyMetrics(student.id);
  const summary = { id: student.id, name: student.name, email: student.email, solvedCount: await solvedCountFor(student.id), submissionCount: countValue(all[0]), lastActiveAt: submissions[0]?.submission.createdAt.toISOString() ?? null };
  return res.json(GetStudentAnalyticsResponse.parse({ student: summary, accepted: countValue(accepted[0]), rejected: Math.max(countValue(all[0]) - countValue(accepted[0]), 0), byDifficulty, recentSubmissions: submissions.map(({ submission, problemTitle, studentName }) => formatSubmission(submission, problemTitle, studentName)) }));
});

router.get("/progress", requireAuth, requireRoles("student"), async (req, res) => {
  const user = currentUser(req)!;
  const [published, solved] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(problemsTable).where(eq(problemsTable.status, "published")),
    solvedCountFor(user.id),
  ]);
  const response = { solvedCount: solved, totalPublished: countValue(published[0]), completionPercent: countValue(published[0]) ? (solved / countValue(published[0])) * 100 : 0, streak: Math.min(solved, 7), byDifficulty: await difficultyMetrics(user.id), recentActivity: await recentActivity(user.id) };
  return res.json(GetProgressResponse.parse(response));
});

router.get("/activity", requireAuth, async (_req, res) => res.json(ListActivityResponse.parse(await recentActivity())));

async function solvedCountFor(studentId: string) {
  const rows = await db.select({ count: sql<number>`count(distinct problem_id)` }).from(submissionsTable).where(and(eq(submissionsTable.studentId, studentId), eq(submissionsTable.status, "accepted")));
  return countValue(rows[0]);
}

async function difficultyMetrics(studentId: string) {
  const result = await Promise.all(["easy", "medium", "hard"].map(async (difficulty) => {
    const rows = await db.select({ count: sql<number>`count(distinct ${submissionsTable.problemId})` }).from(submissionsTable).innerJoin(problemsTable, eq(problemsTable.id, submissionsTable.problemId)).where(and(eq(submissionsTable.studentId, studentId), eq(submissionsTable.status, "accepted"), eq(problemsTable.difficulty, difficulty)));
    return { label: difficulty[0].toUpperCase() + difficulty.slice(1), value: countValue(rows[0]) };
  }));
  return result;
}

async function recentActivity(studentId?: string) {
  const conditions = studentId ? eq(submissionsTable.studentId, studentId) : undefined;
  const rows = await db.select({ submission: submissionsTable, problemTitle: problemsTable.title, userName: usersTable.name })
    .from(submissionsTable).innerJoin(problemsTable, eq(problemsTable.id, submissionsTable.problemId)).innerJoin(usersTable, eq(usersTable.id, submissionsTable.studentId))
    .where(conditions).orderBy(desc(submissionsTable.createdAt)).limit(8);
  return rows.map(({ submission, problemTitle, userName }) => ({
    id: submission.id, type: submission.status === "accepted" ? "solve" as const : "submission" as const,
    message: submission.status === "accepted" ? `${userName} solved ${problemTitle}` : `${userName} submitted ${problemTitle}`,
    createdAt: submission.createdAt.toISOString(), userName,
  }));
}

async function weeklySubmissionMetrics() {
  const rows = await db.select({ day: sql<string>`to_char(${submissionsTable.createdAt}, 'Dy')`, count: sql<number>`count(*)` }).from(submissionsTable).groupBy(sql`to_char(${submissionsTable.createdAt}, 'Dy')`);
  const counts = new Map(rows.map((row) => [row.day.trim(), countValue(row)]));
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => ({ label, value: counts.get(label) ?? 0 }));
}

function formatSubmission(submission: typeof submissionsTable.$inferSelect, problemTitle: string, studentName: string) {
  return {
    id: submission.id, problemId: submission.problemId, problemTitle, studentId: submission.studentId, studentName,
    code: submission.code, status: submission.status as "accepted" | "rejected" | "error",
    passedTests: submission.passedTests, totalTests: submission.totalTests, runtimeMs: submission.runtimeMs, createdAt: submission.createdAt.toISOString(),
  };
}

export default router;