import type express from "express";
import { randomUUID } from "crypto";

const cookieValue = (
  cookieHeader: string | undefined,
  name: string
): string | null => {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = part.slice(0, eq);
    if (k !== name) continue;
    const v = part.slice(eq + 1);
    return decodeURIComponent(v);
  }
  return null;
};

const setCookie = (
  res: express.Response,
  name: string,
  value: string,
  opts: { maxAgeSeconds: number }
) => {
  const attrs: string[] = [];
  attrs.push(`${name}=${encodeURIComponent(value)}`);
  attrs.push(`Path=/`);
  attrs.push(`HttpOnly`);
  attrs.push(`SameSite=Lax`);
  attrs.push(`Max-Age=${Math.max(0, Math.floor(opts.maxAgeSeconds))}`);
  if (process.env.NODE_ENV === "production") attrs.push(`Secure`);
  res.setHeader("Set-Cookie", attrs.join("; "));
};

const getOrSetOwnerId = (
  req: express.Request,
  res: express.Response
): string => {
  const existing = cookieValue(req.headers.cookie, "sid");
  if (existing) return existing;
  const sid = randomUUID();
  setCookie(res, "sid", sid, { maxAgeSeconds: 60 * 60 * 24 * 30 });
  return sid;
};

export const authSid = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  res.locals.ownerId = getOrSetOwnerId(req, res);
  next();
};
