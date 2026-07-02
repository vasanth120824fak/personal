import { clearSessionCookie } from "./_lib/auth.js";
import { json } from "./_lib/http.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  return json(
    200,
    { ok: true },
    {
      "Set-Cookie": clearSessionCookie(),
    },
  );
}
