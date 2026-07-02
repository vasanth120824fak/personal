import { verifySession } from "./_lib/auth.js";
import { getCollections } from "./_lib/db.js";
import { json } from "./_lib/http.js";
import { normalizeVault } from "./_lib/vault.js";

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed." });
  }

  try {
    const session = verifySession(event);
    const { vaults } = await getCollections();
    const vault = await vaults.findOne({ userId: session.userId });
    return json(200, { vault: normalizeVault(vault?.data || {}) });
  } catch {
    return json(401, { error: "Unauthorized" });
  }
}
