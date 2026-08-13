import { createHmac, timingSafeEqual } from "node:crypto";

const encode = value => Buffer.from(value).toString("base64url");
const decode = value => Buffer.from(value, "base64url").toString("utf8");

const safeEqual = (a, b) => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

const signatureFor = (payload, secret) => createHmac("sha256", secret).update(payload).digest("base64url");

export const createAdminToken = secret => {
  const payload = encode(JSON.stringify({ role: "hotline-admin", exp: Date.now() + 8 * 60 * 60 * 1000 }));
  return `${payload}.${signatureFor(payload, secret)}`;
};

export const verifyAdminToken = (token, secret) => {
  if (!token || !secret) return false;
  const [payload, signature, extra] = String(token).split(".");
  if (!payload || !signature || extra) return false;
  const expected = signatureFor(payload, secret);
  if (!safeEqual(signature, expected)) return false;
  try {
    const data = JSON.parse(decode(payload));
    return data.role === "hotline-admin" && Number(data.exp) > Date.now();
  } catch {
    return false;
  }
};

export const passwordMatches = (provided, configured) => safeEqual(provided, configured);

export const getBearerToken = request => {
  const authorization = request.headers.get("authorization") || "";
  return authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
};
