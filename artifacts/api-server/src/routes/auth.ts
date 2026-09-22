import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { LoginBody, LoginResponse, RegisterBody, RegisterResponse, GetCurrentUserResponse } from "@workspace/api-zod";
import { currentUser, issueToken, requireAuth } from "../middleware/auth";
import { publicUser } from "../lib/format";

const router: IRouter = Router();

router.post("/auth/register", async (req, res) => {
  const input = RegisterBody.parse(req.body);
  const email = input.email.toLowerCase().trim();
  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length) return res.status(400).json({ error: "An account with that email already exists" });
  const user = (await db.insert(usersTable).values({
    id: randomUUID(),
    name: input.name.trim(),
    email,
    passwordHash: await bcrypt.hash(input.password, 10),
    role: "student",
  }).returning())[0];
  const safeUser = publicUser(user);
  const response = RegisterResponse.parse({ token: issueToken(safeUser), user: safeUser });
  return res.status(201).json(response);
});

router.post("/auth/login", async (req, res) => {
  const input = LoginBody.parse(req.body);
  const user = (await db.select().from(usersTable).where(eq(usersTable.email, input.email.toLowerCase().trim())).limit(1))[0];
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) return res.status(401).json({ error: "Email or password is incorrect" });
  const safeUser = publicUser(user);
  return res.json(LoginResponse.parse({ token: issueToken(safeUser), user: safeUser }));
});

router.get("/auth/me", requireAuth, (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: "Authentication required" });
  return res.json(GetCurrentUserResponse.parse(user));
});

export default router;