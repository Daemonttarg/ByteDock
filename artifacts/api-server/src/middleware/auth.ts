import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type AppRole = "admin" | "staff" | "student";
export type AuthUser = { id: string; name: string; email: string; role: AppRole };

const secret = () => process.env.SESSION_SECRET ?? "bytedock-development-secret";

export function issueToken(user: AuthUser) {
  return jwt.sign(user, secret(), { expiresIn: "7d" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    (req as Request & { user?: AuthUser }).user = jwt.verify(token, secret()) as AuthUser;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRoles(...roles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: "You do not have access to this resource" });
      return;
    }
    next();
  };
}

export function currentUser(req: Request) {
  return (req as Request & { user?: AuthUser }).user;
}