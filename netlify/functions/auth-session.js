import { verifySession } from "./_lib/auth.js";
import { json } from "./_lib/http.js";

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed." });
  }

  try {
    const session = verifySession(event);
    return json(200, { email: session.email });
  } catch {
    return json(401, { error: "Unauthorized" });
  }
}
