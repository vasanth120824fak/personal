import { verifySession } from "./_lib/auth.js";
import { uploadBufferFile } from "./_lib/db.js";
import { json, readJsonBody } from "./_lib/http.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  try {
    const session = verifySession(event);
    const { name, displayName, mimeType, category, linkedTo, data } = readJsonBody(event);

    if (!name || !data) {
      return json(400, { error: "File name and data are required." });
    }

    const file = await uploadBufferFile({
      userId: session.userId.toString(),
      name,
      displayName,
      mimeType,
      category,
      linkedTo,
      data,
    });

    return json(201, { file });
  } catch (error) {
    const status = error.message === "Unauthorized" ? 401 : 500;
    return json(status, { error: status === 401 ? "Unauthorized" : "Upload failed." });
  }
}
