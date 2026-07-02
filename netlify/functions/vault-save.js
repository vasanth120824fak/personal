import { verifySession } from "./_lib/auth.js";
import { getCollections } from "./_lib/db.js";
import { json, readJsonBody } from "./_lib/http.js";
import { normalizeVault } from "./_lib/vault.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  try {
    const session = verifySession(event);
    const { vault } = readJsonBody(event);
    const { vaults } = await getCollections();
    const normalized = normalizeVault(vault || {});

    await vaults.updateOne(
      { userId: session.userId },
      {
        $set: {
          data: normalized,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );

    return json(200, { ok: true });
  } catch (error) {
    const status = error.message === "Unauthorized" ? 401 : 500;
    return json(status, { error: status === 401 ? "Unauthorized" : "Save failed." });
  }
}
