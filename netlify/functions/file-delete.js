import { verifySession } from "./_lib/auth.js";
import { deleteFile } from "./_lib/db.js";
import { json } from "./_lib/http.js";

export async function handler(event) {
  if (event.httpMethod !== "DELETE") {
    return json(405, { error: "Method not allowed." });
  }

  try {
    const session = verifySession(event);
    const fileId = event.queryStringParameters?.id;
    if (!fileId) {
      return json(400, { error: "File id is required." });
    }

    const deleted = await deleteFile(fileId, session.userId.toString());
    if (!deleted) {
      return json(404, { error: "File not found." });
    }

    return json(200, { ok: true });
  } catch (error) {
    const status = error.message === "Unauthorized" ? 401 : 500;
    return json(status, { error: status === 401 ? "Unauthorized" : "Delete failed." });
  }
}
