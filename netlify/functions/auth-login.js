import bcrypt from "bcryptjs";
import { signSession, buildSessionCookie } from "./_lib/auth.js";
import { getCollections } from "./_lib/db.js";
import { json, readJsonBody } from "./_lib/http.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  try {
    const { email, password } = readJsonBody(event);
    const { users } = await getCollections();
    const normalizedEmail = email.trim().toLowerCase();
    const user = await users.findOne({ email: normalizedEmail });

    if (!user) {
      return json(401, { error: "Invalid email or password." });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return json(401, { error: "Invalid email or password." });
    }

    const token = signSession(user);
    return json(
      200,
      { email: user.email },
      {
        "Set-Cookie": buildSessionCookie(token),
      },
    );
  } catch (error) {
    return json(500, { error: error.message || "Login failed." });
  }
}
