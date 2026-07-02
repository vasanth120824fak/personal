import bcrypt from "bcryptjs";
import { signSession, buildSessionCookie } from "./_lib/auth.js";
import { ensureIndexes, getCollections } from "./_lib/db.js";
import { json, readJsonBody } from "./_lib/http.js";
import { createDefaultVault } from "../../src/data.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  try {
    const { email, password } = readJsonBody(event);
    if (!email || !password || password.length < 8) {
      return json(400, { error: "Email and strong password are required." });
    }

    await ensureIndexes();
    const { users, vaults } = await getCollections();
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await users.findOne({ email: normalizedEmail });

    if (existing) {
      return json(409, { error: "Account already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = {
      email: normalizedEmail,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const insertResult = await users.insertOne(user);
    const createdUser = { ...user, _id: insertResult.insertedId };

    await vaults.insertOne({
      userId: createdUser._id,
      data: createDefaultVault(),
      updatedAt: new Date(),
    });

    const token = signSession(createdUser);
    return json(
      201,
      { email: createdUser.email },
      {
        "Set-Cookie": buildSessionCookie(token),
      },
    );
  } catch (error) {
    return json(500, { error: error.message || "Registration failed." });
  }
}
