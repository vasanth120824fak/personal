import bcrypt from "bcryptjs";
import { signSession, buildSessionCookie, verifySession } from "./_lib/auth.js";
import { ensureIndexes, getCollections } from "./_lib/db.js";
import { json, readJsonBody } from "./_lib/http.js";
import { createDefaultVault } from "../../src/data.js";

const ADMIN_EMAIL = "admin@gmail.com";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  try {
    const session = verifySession(event);
    const { email, pin } = readJsonBody(event);
    if (!email || !/^\d{6}$/.test(String(pin || ""))) {
      return json(400, { error: "Email and 6-digit PIN are required." });
    }

    if (session.email !== ADMIN_EMAIL) {
      return json(403, { error: "Only admin can create users." });
    }

    await ensureIndexes();
    const { users, vaults } = await getCollections();
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await users.findOne({ email: normalizedEmail });

    if (existing) {
      return json(409, { error: "Account already exists." });
    }

    const pinHash = await bcrypt.hash(String(pin), 12);
    const user = {
      email: normalizedEmail,
      pinHash,
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
