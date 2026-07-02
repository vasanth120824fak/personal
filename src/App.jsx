import { useEffect, useMemo, useState } from "react";
import {
  createAchievement,
  createAnswer,
  createBankAccount,
  createCertificate,
  createDefaultVault,
  createFamilyMember,
  sectionLabels,
} from "./data";
import {
  deleteDocument,
  downloadDocument,
  getSessionUser,
  loadVault,
  loginUser,
  logoutUser,
  registerUser,
  saveVault,
  uploadDocument,
} from "./api";

const sections = Object.entries(sectionLabels);

export default function App() {
  const [authMode, setAuthMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [vault, setVault] = useState(null);
  const [activeSection, setActiveSection] = useState("personalInfo");
  const [editMode, setEditMode] = useState(false);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      try {
        const session = await getSessionUser();
        const payload = await loadVault();
        setUserEmail(session.email);
        setEmail(session.email);
        setVault(payload.vault || createDefaultVault());
      } catch {
        setVault(null);
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, []);

  const searchResults = useMemo(() => {
    if (!vault || !search.trim()) {
      return [];
    }

    const text = search.toLowerCase();
    return sections
      .filter(([key, label]) => {
        const sectionData = JSON.stringify(vault[key] ?? "").toLowerCase();
        return label.toLowerCase().includes(text) || sectionData.includes(text);
      })
      .map(([key, label]) => ({ key, label }));
  }, [search, vault]);

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setStatus("");
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (authMode === "setup") {
        await registerUser(normalizedEmail, password);
      } else {
        await loginUser(normalizedEmail, password);
      }

      const payload = await loadVault();
      setVault(payload.vault || createDefaultVault());
      setUserEmail(normalizedEmail);
      setEmail(normalizedEmail);
      setPassword("");
      setStatus(authMode === "setup" ? "Account created." : "Signed in.");
    } catch (error) {
      setStatus(error.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function persistVault(nextVault, nextStatus = "Changes saved.") {
    setVault(nextVault);
    setSaving(true);
    setStatus("");

    try {
      await saveVault(nextVault);
      setStatus(nextStatus);
    } catch (error) {
      setStatus(error.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function updateGroup(group, field, value) {
    persistVault({
      ...vault,
      [group]: {
        ...vault[group],
        [field]: value,
      },
    });
  }

  function updateListItem(group, itemId, field, value) {
    persistVault({
      ...vault,
      [group]: vault[group].map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item,
      ),
    });
  }

  function addListItem(group, factory) {
    persistVault({
      ...vault,
      [group]: [...vault[group], factory()],
    });
  }

  function removeListItem(group, itemId) {
    persistVault({
      ...vault,
      [group]: vault[group].filter((item) => item.id !== itemId),
    });
  }

  function updateNestedBank(ownerGroup, ownerId, bankId, field, value) {
    persistVault({
      ...vault,
      [ownerGroup]: vault[ownerGroup].map((item) => {
        if (item.id !== ownerId) {
          return item;
        }

        return {
          ...item,
          bankAccounts: item.bankAccounts.map((bank) =>
            bank.id === bankId ? { ...bank, [field]: value } : bank,
          ),
        };
      }),
    });
  }

  function addNestedBank(ownerGroup, ownerId) {
    persistVault({
      ...vault,
      [ownerGroup]: vault[ownerGroup].map((item) =>
        item.id === ownerId
          ? { ...item, bankAccounts: [...item.bankAccounts, createBankAccount()] }
          : item,
      ),
    });
  }

  async function handleFileUpload(event, target) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setStatus("Uploading document...");

    try {
      const data = await fileToBase64(file);
      const payload = await uploadDocument({
        name: file.name,
        mimeType: file.type,
        category: target.category,
        linkedTo: target.linkedTo,
        data,
      });

      const metadata = payload.file;
      const nextVault = { ...vault, documents: [...vault.documents, metadata] };

      if (target.kind === "careerResume") {
        nextVault.career = { ...vault.career, resumeDocumentId: metadata.id };
      }

      if (target.kind === "certificate") {
        nextVault.certificates = vault.certificates.map((certificate) =>
          certificate.id === target.linkedTo
            ? { ...certificate, documentId: metadata.id }
            : certificate,
        );
      }

      if (target.kind === "family") {
        nextVault.family = vault.family.map((member) =>
          member.id === target.linkedTo
            ? { ...member, documentIds: [...member.documentIds, metadata.id] }
            : member,
        );
      }

      await persistVault(nextVault, "Document uploaded.");
    } catch (error) {
      setStatus(error.message || "Upload failed.");
    } finally {
      event.target.value = "";
    }
  }

  async function handleDownload(document) {
    try {
      const blob = await downloadDocument(document.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = document.name;
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus("Download started.");
    } catch (error) {
      setStatus(error.message || "Download failed.");
    }
  }

  async function removeDocument(documentId) {
    try {
      await deleteDocument(documentId);

      const nextVault = {
        ...vault,
        documents: vault.documents.filter((document) => document.id !== documentId),
        certificates: vault.certificates.map((certificate) =>
          certificate.documentId === documentId
            ? { ...certificate, documentId: "" }
            : certificate,
        ),
        career:
          vault.career.resumeDocumentId === documentId
            ? { ...vault.career, resumeDocumentId: "" }
            : vault.career,
        family: vault.family.map((member) => ({
          ...member,
          documentIds: member.documentIds.filter((entryId) => entryId !== documentId),
        })),
      };

      await persistVault(nextVault, "Document removed.");
    } catch (error) {
      setStatus(error.message || "Delete failed.");
    }
  }

  async function copyValue(value) {
    await navigator.clipboard.writeText(String(value ?? ""));
    setStatus("Copied.");
  }

  async function handleLogout() {
    await logoutUser();
    setVault(null);
    setUserEmail("");
    setEmail("");
    setPassword("");
    setSearch("");
    setStatus("Signed out.");
  }

  if (loading) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <p className="eyebrow">Private Personal Vault</p>
          <h1>Loading your workspace</h1>
          <p className="subtitle">Checking your secure session and MongoDB vault.</p>
        </div>
      </div>
    );
  }

  if (!vault) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <p className="eyebrow">MongoDB Vault</p>
          <h1>{authMode === "setup" ? "Create your account" : "Sign in with email"}</h1>
          <p className="subtitle">
            This version stores profile data and uploaded documents fully inside MongoDB.
          </p>
          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
            </label>
            <button className="primary-button" type="submit">
              {authMode === "setup" ? "Create Account" : "Sign In"}
            </button>
          </form>
          <button
            className="ghost-button"
            type="button"
            onClick={() => setAuthMode((mode) => (mode === "setup" ? "signin" : "setup"))}
          >
            {authMode === "setup" ? "I already have an account" : "Create a new account"}
          </button>
          {status ? <p className="status-text">{status}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>{vault.settings.vaultTitle}</h2>
          <p className="muted">{userEmail}</p>
        </div>

        <label className="search-box">
          <span>Search</span>
          <input
            placeholder={vault.settings.searchHint}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <nav className="nav-list">
          {(searchResults.length > 0 ? searchResults : sections.map(([key, label]) => ({ key, label }))).map(
            (item) => (
              <button
                key={item.key}
                className={item.key === activeSection ? "nav-item active" : "nav-item"}
                onClick={() => setActiveSection(item.key)}
                type="button"
              >
                {item.label}
              </button>
            ),
          )}
        </nav>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">MongoDB Secured</p>
            <h1>{sectionLabels[activeSection]}</h1>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button" type="button" onClick={() => setEditMode((value) => !value)}>
              {editMode ? "View Mode" : "Edit Mode"}
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => copyValue(JSON.stringify(vault, null, 2))}
            >
              Copy All
            </button>
            <button className="primary-button" type="button" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </header>

        {status ? <p className="status-banner">{status}</p> : null}
        {saving ? <p className="status-text">Saving to MongoDB...</p> : null}

        {activeSection === "personalInfo" && (
          <FieldGrid
            data={vault.personalInfo}
            editMode={editMode}
            onChange={(field, value) => updateGroup("personalInfo", field, value)}
            onCopy={copyValue}
          />
        )}

        {activeSection === "contacts" && (
          <FieldGrid
            data={vault.contacts}
            editMode={editMode}
            onChange={(field, value) => updateGroup("contacts", field, value)}
            onCopy={copyValue}
          />
        )}

        {activeSection === "education" && (
          <FieldGrid
            data={vault.education}
            editMode={editMode}
            onChange={(field, value) => updateGroup("education", field, value)}
            onCopy={copyValue}
          />
        )}

        {activeSection === "college" && (
          <FieldGrid
            data={vault.college}
            editMode={editMode}
            onChange={(field, value) => updateGroup("college", field, value)}
            onCopy={copyValue}
          />
        )}

        {activeSection === "governmentIds" && (
          <FieldGrid
            data={vault.governmentIds}
            editMode={editMode}
            onChange={(field, value) => updateGroup("governmentIds", field, value)}
            onCopy={copyValue}
          />
        )}

        {activeSection === "socialLinks" && (
          <FieldGrid
            data={vault.socialLinks}
            editMode={editMode}
            onChange={(field, value) => updateGroup("socialLinks", field, value)}
            onCopy={copyValue}
          />
        )}

        {activeSection === "settings" && (
          <FieldGrid
            data={vault.settings}
            editMode={editMode}
            onChange={(field, value) => updateGroup("settings", field, value)}
            onCopy={copyValue}
          />
        )}

        {activeSection === "family" && (
          <section className="section-stack">
            <div className="subsection-header">
              <h3>Family Members</h3>
              <button
                className="primary-button"
                type="button"
                onClick={() => addListItem("family", () => createFamilyMember())}
              >
                Add Family Member
              </button>
            </div>
            {vault.family.map((member) => (
              <article className="panel" key={member.id}>
                <div className="panel-header">
                  <h3>{member.relation}</h3>
                  <div className="inline-actions">
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => copyValue(JSON.stringify(member, null, 2))}
                    >
                      Copy
                    </button>
                    <label className="ghost-button upload-button">
                      Upload Document
                      <input
                        type="file"
                        hidden
                        onChange={(event) =>
                          handleFileUpload(event, {
                            kind: "family",
                            category: `${member.relation} document`,
                            linkedTo: member.id,
                          })
                        }
                      />
                    </label>
                    <button
                      className="ghost-button danger"
                      type="button"
                      onClick={() => removeListItem("family", member.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <FieldGrid
                  data={{
                    relation: member.relation,
                    name: member.name,
                    mobile: member.mobile,
                    email: member.email,
                    aadhaarNumber: member.aadhaarNumber,
                    panNumber: member.panNumber,
                    notes: member.notes,
                  }}
                  editMode={editMode}
                  onChange={(field, value) => updateListItem("family", member.id, field, value)}
                  onCopy={copyValue}
                />
                <div className="subsection-header">
                  <h4>Bank Accounts</h4>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => addNestedBank("family", member.id)}
                  >
                    Add Bank Account
                  </button>
                </div>
                {member.bankAccounts.map((bank) => (
                  <FieldGrid
                    key={bank.id}
                    data={bank}
                    editMode={editMode}
                    onChange={(field, value) => updateNestedBank("family", member.id, bank.id, field, value)}
                    onCopy={copyValue}
                  />
                ))}
                <DocumentList
                  documents={vault.documents.filter((entry) => member.documentIds.includes(entry.id))}
                  onDownload={handleDownload}
                  onDelete={removeDocument}
                />
              </article>
            ))}
          </section>
        )}

        {activeSection === "bankAccounts" && (
          <RepeatableSection
            title="Bank Accounts"
            items={vault.bankAccounts}
            addLabel="Add Bank Account"
            onAdd={() => addListItem("bankAccounts", createBankAccount)}
            onRemove={(itemId) => removeListItem("bankAccounts", itemId)}
            onCopy={copyValue}
            renderItem={(account) => (
              <FieldGrid
                data={account}
                editMode={editMode}
                onChange={(field, value) => updateListItem("bankAccounts", account.id, field, value)}
                onCopy={copyValue}
              />
            )}
          />
        )}

        {activeSection === "documents" && (
          <section className="section-stack">
            <div className="subsection-header">
              <h3>All Documents</h3>
              <label className="primary-button upload-button">
                Add Document
                <input
                  type="file"
                  hidden
                  onChange={(event) =>
                    handleFileUpload(event, {
                      kind: "document",
                      category: "General document",
                      linkedTo: "",
                    })
                  }
                />
              </label>
            </div>
            <DocumentList documents={vault.documents} onDownload={handleDownload} onDelete={removeDocument} />
          </section>
        )}

        {activeSection === "career" && (
          <section className="section-stack">
            <FieldGrid
              data={{
                currentSkills: vault.career.currentSkills,
                experience: vault.career.experience,
                projects: vault.career.projects,
                internships: vault.career.internships,
              }}
              editMode={editMode}
              onChange={(field, value) => updateGroup("career", field, value)}
              onCopy={copyValue}
            />
            <div className="panel">
              <div className="panel-header">
                <h3>Resume</h3>
                <label className="ghost-button upload-button">
                  Upload Resume
                  <input
                    type="file"
                    hidden
                    onChange={(event) =>
                      handleFileUpload(event, {
                        kind: "careerResume",
                        category: "Resume",
                        linkedTo: "career",
                      })
                    }
                  />
                </label>
              </div>
              <DocumentList
                documents={vault.documents.filter((entry) => entry.id === vault.career.resumeDocumentId)}
                onDownload={handleDownload}
                onDelete={removeDocument}
              />
            </div>
          </section>
        )}

        {activeSection === "certificates" && (
          <RepeatableSection
            title="Certificates"
            items={vault.certificates}
            addLabel="Add Certificate"
            onAdd={() => addListItem("certificates", createCertificate)}
            onRemove={(itemId) => removeListItem("certificates", itemId)}
            onCopy={copyValue}
            renderItem={(certificate) => (
              <div className="section-stack">
                <FieldGrid
                  data={certificate}
                  editMode={editMode}
                  onChange={(field, value) => updateListItem("certificates", certificate.id, field, value)}
                  onCopy={copyValue}
                />
                <label className="ghost-button upload-button">
                  Upload Certificate File
                  <input
                    type="file"
                    hidden
                    onChange={(event) =>
                      handleFileUpload(event, {
                        kind: "certificate",
                        category: "Certificate",
                        linkedTo: certificate.id,
                      })
                    }
                  />
                </label>
                <DocumentList
                  documents={vault.documents.filter((entry) => entry.id === certificate.documentId)}
                  onDownload={handleDownload}
                  onDelete={removeDocument}
                />
              </div>
            )}
          />
        )}

        {activeSection === "achievements" && (
          <RepeatableSection
            title="Achievements"
            items={vault.achievements}
            addLabel="Add Achievement"
            onAdd={() => addListItem("achievements", createAchievement)}
            onRemove={(itemId) => removeListItem("achievements", itemId)}
            onCopy={copyValue}
            renderItem={(achievement) => (
              <FieldGrid
                data={achievement}
                editMode={editMode}
                onChange={(field, value) => updateListItem("achievements", achievement.id, field, value)}
                onCopy={copyValue}
              />
            )}
          />
        )}

        {activeSection === "frequentAnswers" && (
          <RepeatableSection
            title="Frequently Used Answers"
            items={vault.frequentAnswers}
            addLabel="Add Answer"
            onAdd={() => addListItem("frequentAnswers", createAnswer)}
            onRemove={(itemId) => removeListItem("frequentAnswers", itemId)}
            onCopy={copyValue}
            renderItem={(answer) => (
              <FieldGrid
                data={answer}
                editMode={editMode}
                onChange={(field, value) => updateListItem("frequentAnswers", answer.id, field, value)}
                onCopy={copyValue}
              />
            )}
          />
        )}

        {activeSection === "accounts" && (
          <RepeatableSection
            title="Accounts"
            items={vault.accounts}
            addLabel="Add Account"
            onAdd={() =>
              addListItem("accounts", () => ({
                id: crypto.randomUUID(),
                platform: "",
                username: "",
                email: "",
                notes: "",
              }))
            }
            onRemove={(itemId) => removeListItem("accounts", itemId)}
            onCopy={copyValue}
            renderItem={(account) => (
              <FieldGrid
                data={account}
                editMode={editMode}
                onChange={(field, value) => updateListItem("accounts", account.id, field, value)}
                onCopy={copyValue}
              />
            )}
          />
        )}
      </main>
    </div>
  );
}

function FieldGrid({ data, editMode, onChange, onCopy }) {
  return (
    <div className="field-grid">
      {Object.entries(data).map(([field, value]) => (
        <label className="field-card" key={field}>
          <span>{toLabel(field)}</span>
          <div className="field-row">
            {editMode ? (
              <textarea
                rows={String(value ?? "").length > 60 ? 4 : 1}
                value={String(value ?? "")}
                onChange={(event) => onChange(field, event.target.value)}
              />
            ) : (
              <div className="field-value">{String(value || "Not set")}</div>
            )}
            <button className="copy-button" type="button" onClick={() => onCopy(value)}>
              Copy
            </button>
          </div>
        </label>
      ))}
    </div>
  );
}

function RepeatableSection({ title, items, addLabel, onAdd, onRemove, onCopy, renderItem }) {
  return (
    <section className="section-stack">
      <div className="subsection-header">
        <h3>{title}</h3>
        <button className="primary-button" type="button" onClick={onAdd}>
          {addLabel}
        </button>
      </div>
      {items.map((item, index) => (
        <article className="panel" key={item.id}>
          <div className="panel-header">
            <h4>
              {title} {index + 1}
            </h4>
            <div className="inline-actions">
              <button className="ghost-button" type="button" onClick={() => onCopy(JSON.stringify(item, null, 2))}>
                Copy
              </button>
              <button className="ghost-button danger" type="button" onClick={() => onRemove(item.id)}>
                Remove
              </button>
            </div>
          </div>
          {renderItem(item)}
        </article>
      ))}
    </section>
  );
}

function DocumentList({ documents, onDownload, onDelete }) {
  if (!documents.length) {
    return <div className="empty-state">No documents uploaded yet.</div>;
  }

  return (
    <div className="document-list">
      {documents.map((entry) => (
        <article className="document-card" key={entry.id}>
          <div>
            <h4>{entry.name}</h4>
            <p>
              {entry.category} | {formatFileSize(entry.size)}
            </p>
          </div>
          <div className="inline-actions">
            <button className="ghost-button" type="button" onClick={() => onDownload(entry)}>
              Download
            </button>
            <button className="ghost-button danger" type="button" onClick={() => onDelete(entry.id)}>
              Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function toLabel(value) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}
