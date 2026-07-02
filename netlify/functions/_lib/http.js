export function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

export function readJsonBody(event) {
  return event.body ? JSON.parse(event.body) : {};
}
