import { verifySession } from "./_lib/auth.js";
import { downloadFileToBuffer } from "./_lib/db.js";
import { json } from "./_lib/http.js";

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed." });
  }

  try {
    const session = verifySession(event);
    const fileId = event.queryStringParameters?.id;
    if (!fileId) {
      return json(400, { error: "File id is required." });
    }

    const result = await downloadFileToBuffer(fileId, session.userId.toString());
    if (!result) {
      return json(404, { error: "File not found." });
    }

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        "Content-Type": result.file.contentType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(result.file.filename)}"`,
      },
      body: result.buffer.toString("base64"),
    };
  } catch (error) {
    const status = error.message === "Unauthorized" ? 401 : 500;
    return json(status, { error: status === 401 ? "Unauthorized" : "Download failed." });
  }
}
