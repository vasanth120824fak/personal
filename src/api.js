const API_BASE = "/.netlify/functions";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}/${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

export function registerUser(email, pin) {
  return request("auth-register", {
    method: "POST",
    body: JSON.stringify({ email, pin }),
  });
}

export function loginUser(email, pin) {
  return request("auth-login", {
    method: "POST",
    body: JSON.stringify({ email, pin }),
  });
}

export function logoutUser() {
  return request("auth-logout", {
    method: "POST",
  });
}

export function getSessionUser() {
  return request("auth-session");
}

export function loadVault() {
  return request("vault-get");
}

export function saveVault(vault) {
  return request("vault-save", {
    method: "POST",
    body: JSON.stringify({ vault }),
  });
}

export function uploadDocument(document) {
  return request("file-upload", {
    method: "POST",
    body: JSON.stringify(document),
  });
}

export async function downloadDocument(documentId) {
  const response = await fetch(`${API_BASE}/file-download?id=${encodeURIComponent(documentId)}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Download failed.");
  }

  return response.blob();
}

export function deleteDocument(documentId) {
  return request(`file-delete?id=${encodeURIComponent(documentId)}`, {
    method: "DELETE",
  });
}
