import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

const COOKIE_NAME = "vault_session";
const SEVEN_DAYS = 60 * 60 * 24 * 7;

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required.");
  }
  return secret;
}

export function signSession(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
    },
    getJwtSecret(),
    { expiresIn: SEVEN_DAYS },
  );
}

export function parseCookies(event) {
  const cookieHeader = event.headers.cookie || event.headers.Cookie || "";
  return cookieHeader.split(";").reduce((result, chunk) => {
    const [rawKey, ...rawValue] = chunk.trim().split("=");
    if (!rawKey) {
      return result;
    }
    result[rawKey] = decodeURIComponent(rawValue.join("="));
    return result;
  }, {});
}

export function buildSessionCookie(token) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SEVEN_DAYS}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function getTokenFromEvent(event) {
  const cookies = parseCookies(event);
  return cookies[COOKIE_NAME];
}

export function verifySession(event) {
  const token = getTokenFromEvent(event);
  if (!token) {
    throw new Error("Unauthorized");
  }
  const payload = jwt.verify(token, getJwtSecret());
  return {
    userId: new ObjectId(payload.sub),
    email: payload.email,
  };
}
