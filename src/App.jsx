import { useEffect, useMemo, useState } from "react";
import {
  createCustomField,
  createAchievement,
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
  saveVault,
  uploadDocument,
} from "./api";

const sections = Object.entries(sectionLabels);
const vaultTitle = "Private Personal Vault";
const searchHint = "Search mother, aadhaar, resume, college email...";

export default function App() {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [vault, setVault] = useState(null);
  const [activeSection, setActiveSection] = useState("personalInfo");
  const [editMode, setEditMode] = useState(false);
  const [status, setStatus] = useState("");
  const [busyText, setBusyText] = useState("");
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
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      setBusyText("Signing in...");
      await loginUser(normalizedEmail, pin);

      const payload = await loadVault();
      setVault(payload.vault || createDefaultVault());
      setUserEmail(normalizedEmail);
      setEmail(normalizedEmail);
      setPin("");
      setStatus("Signed in.");
    } catch (error) {
      setStatus(error.message || "Authentication failed.");
    } finally {
      setLoading(false);
      setBusyText("");
    }
  }

  async function persistVault(nextVault, nextStatus = "Changes saved.") {
    setVault(nextVault);
    setSaving(true);
    setBusyText("Saving...");

    try {
      await saveVault(nextVault);
      setStatus(nextStatus);
    } catch (error) {
      setStatus(error.message || "Save failed.");
    } finally {
      setSaving(false);
      setBusyText("");
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

  function addCustomFieldToGroup(group) {
    persistVault({
      ...vault,
      [group]: {
        ...vault[group],
        customFields: [...(vault[group].customFields || []), createCustomField("New field", "")],
      },
    });
  }

  function updateCustomFieldInGroup(group, fieldId, key, value) {
    persistVault({
      ...vault,
      [group]: {
        ...vault[group],
        customFields: (vault[group].customFields || []).map((field) =>
          field.id === fieldId ? { ...field, [key]: value } : field,
        ),
      },
    });
  }

  function removeCustomFieldFromGroup(group, fieldId) {
    persistVault({
      ...vault,
      [group]: {
        ...vault[group],
        customFields: (vault[group].customFields || []).filter((field) => field.id !== fieldId),
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

  function addCustomFieldToItem(group, itemId) {
    persistVault({
      ...vault,
      [group]: vault[group].map((item) =>
        item.id === itemId
          ? {
              ...item,
              customFields: [...(item.customFields || []), createCustomField("New field", "")],
            }
          : item,
      ),
    });
  }

  function updateCustomFieldInItem(group, itemId, fieldId, key, value) {
    persistVault({
      ...vault,
      [group]: vault[group].map((item) =>
        item.id === itemId
          ? {
              ...item,
              customFields: (item.customFields || []).map((field) =>
                field.id === fieldId ? { ...field, [key]: value } : field,
              ),
            }
          : item,
      ),
    });
  }

  function removeCustomFieldFromItem(group, itemId, fieldId) {
    persistVault({
      ...vault,
      [group]: vault[group].map((item) =>
        item.id === itemId
          ? {
              ...item,
              customFields: (item.customFields || []).filter((field) => field.id !== fieldId),
            }
          : item,
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

    try {
      const fileName = await askForDocumentName(target, file.name);
      if (!fileName) {
        event.target.value = "";
        return;
      }

      setBusyText("Uploading document...");
      const data = await fileToBase64(file);
      const payload = await uploadDocument({
        name: file.name,
        displayName: fileName,
        mimeType: file.type,
        category: target.category,
        linkedTo: target.linkedTo,
        data,
      });

      const metadata = payload.file;
      const nextVault = { ...vault, documents: [...vault.documents, metadata] };

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
      setBusyText("");
      event.target.value = "";
    }
  }

  async function handleDownload(fileRecord) {
    try {
      setBusyText("Downloading document...");
      const blob = await downloadDocument(fileRecord.id);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = fileRecord.displayName || fileRecord.name || "download";
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus("Download started.");
    } catch (error) {
      setStatus(error.message || "Download failed.");
    } finally {
      setBusyText("");
    }
  }

  async function removeDocument(documentId) {
    try {
      setBusyText("Removing document...");
      await deleteDocument(documentId);

      const nextVault = {
        ...vault,
        documents: vault.documents.filter((document) => document.id !== documentId),
        certificates: vault.certificates.map((certificate) =>
          certificate.documentId === documentId
            ? { ...certificate, documentId: "" }
            : certificate,
        ),
        family: vault.family.map((member) => ({
          ...member,
          documentIds: member.documentIds.filter((entryId) => entryId !== documentId),
        })),
      };

      await persistVault(nextVault, "Document removed.");
    } catch (error) {
      setStatus(error.message || "Delete failed.");
    } finally {
      setBusyText("");
    }
  }

  async function copyValue(value) {
    setBusyText("Copying...");
    await navigator.clipboard.writeText(String(value ?? ""));
    setStatus("Copied.");
    setBusyText("");
  }

  async function handleLogout() {
    setBusyText("Signing out...");
    await logoutUser();
    setVault(null);
    setUserEmail("");
    setEmail("");
    setPin("");
    setSearch("");
    setStatus("Signed out.");
    setBusyText("");
  }

  if (loading) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <p className="status-text">Loading...</p>
        </div>
      </div>
    );
  }

  if (!vault) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          {busyText ? <p className="status-text">{busyText}</p> : null}
          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <input
              type="email"
              aria-label="Email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <input
              type="password"
              aria-label="PIN"
              placeholder="6-digit PIN"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
            <button className="primary-button" type="submit">
              Unlock
            </button>
          </form>
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
          <h2>{vaultTitle}</h2>
          <p className="muted">{userEmail}</p>
        </div>

        <label className="search-box">
          <span>Search</span>
          <input
            placeholder={searchHint}
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
          <h1>{sectionLabels[activeSection]}</h1>
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
        {busyText ? <p className="status-text">{busyText}</p> : null}

        {activeSection === "personalInfo" && (
          <ObjectSection
            title={sectionLabels.personalInfo}
            data={vault.personalInfo}
            editMode={editMode}
            onChange={(field, value) => updateGroup("personalInfo", field, value)}
            onCopy={copyValue}
            onAddField={() => addCustomFieldToGroup("personalInfo")}
            onCustomFieldChange={(fieldId, key, value) =>
              updateCustomFieldInGroup("personalInfo", fieldId, key, value)
            }
            onCustomFieldRemove={(fieldId) => removeCustomFieldFromGroup("personalInfo", fieldId)}
            onFieldRemove={(field) => updateGroup("personalInfo", field, "")}
          />
        )}

        {activeSection === "contacts" && (
          <ObjectSection
            title={sectionLabels.contacts}
            data={vault.contacts}
            editMode={editMode}
            onChange={(field, value) => updateGroup("contacts", field, value)}
            onCopy={copyValue}
            onAddField={() => addCustomFieldToGroup("contacts")}
            onCustomFieldChange={(fieldId, key, value) =>
              updateCustomFieldInGroup("contacts", fieldId, key, value)
            }
            onCustomFieldRemove={(fieldId) => removeCustomFieldFromGroup("contacts", fieldId)}
            onFieldRemove={(field) => updateGroup("contacts", field, "")}
          />
        )}

        {activeSection === "education" && (
          <ObjectSection
            title={sectionLabels.education}
            data={vault.education}
            editMode={editMode}
            onChange={(field, value) => updateGroup("education", field, value)}
            onCopy={copyValue}
            onAddField={() => addCustomFieldToGroup("education")}
            onCustomFieldChange={(fieldId, key, value) =>
              updateCustomFieldInGroup("education", fieldId, key, value)
            }
            onCustomFieldRemove={(fieldId) => removeCustomFieldFromGroup("education", fieldId)}
            onFieldRemove={(field) => updateGroup("education", field, "")}
          />
        )}

        {activeSection === "college" && (
          <ObjectSection
            title={sectionLabels.college}
            data={vault.college}
            editMode={editMode}
            onChange={(field, value) => updateGroup("college", field, value)}
            onCopy={copyValue}
            onAddField={() => addCustomFieldToGroup("college")}
            onCustomFieldChange={(fieldId, key, value) =>
              updateCustomFieldInGroup("college", fieldId, key, value)
            }
            onCustomFieldRemove={(fieldId) => removeCustomFieldFromGroup("college", fieldId)}
            onFieldRemove={(field) => updateGroup("college", field, "")}
          />
        )}

        {activeSection === "governmentIds" && (
          <ObjectSection
            title={sectionLabels.governmentIds}
            data={vault.governmentIds}
            editMode={editMode}
            onChange={(field, value) => updateGroup("governmentIds", field, value)}
            onCopy={copyValue}
            onAddField={() => addCustomFieldToGroup("governmentIds")}
            onCustomFieldChange={(fieldId, key, value) =>
              updateCustomFieldInGroup("governmentIds", fieldId, key, value)
            }
            onCustomFieldRemove={(fieldId) => removeCustomFieldFromGroup("governmentIds", fieldId)}
            onFieldRemove={(field) => updateGroup("governmentIds", field, "")}
          />
        )}

        {activeSection === "socialLinks" && (
          <ObjectSection
            title={sectionLabels.socialLinks}
            data={vault.socialLinks}
            editMode={editMode}
            onChange={(field, value) => updateGroup("socialLinks", field, value)}
            onCopy={copyValue}
            onAddField={() => addCustomFieldToGroup("socialLinks")}
            onCustomFieldChange={(fieldId, key, value) =>
              updateCustomFieldInGroup("socialLinks", fieldId, key, value)
            }
            onCustomFieldRemove={(fieldId) => removeCustomFieldFromGroup("socialLinks", fieldId)}
            onFieldRemove={(field) => updateGroup("socialLinks", field, "")}
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
                    {editMode ? (
                      <button
                        className="icon-button danger"
                        type="button"
                        onClick={() => removeListItem("family", member.id)}
                      >
                        🗑
                      </button>
                    ) : null}
                  </div>
                </div>
                <ItemSection
                  title={member.relation}
                  data={{
                    relation: member.relation,
                    name: member.name,
                    mobile: member.mobile,
                    email: member.email,
                    aadhaarNumber: member.aadhaarNumber,
                    panNumber: member.panNumber,
                    notes: member.notes,
                    customFields: member.customFields,
                  }}
                  editMode={editMode}
                  onChange={(field, value) => updateListItem("family", member.id, field, value)}
                  onCopy={copyValue}
                  onAddField={() => addCustomFieldToItem("family", member.id)}
                  onCustomFieldChange={(fieldId, key, value) =>
                    updateCustomFieldInItem("family", member.id, fieldId, key, value)
                  }
                  onCustomFieldRemove={(fieldId) =>
                    removeCustomFieldFromItem("family", member.id, fieldId)
                  }
                  onFieldRemove={(field) => updateListItem("family", member.id, field, "")}
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
                  <ItemSection
                    key={bank.id}
                    data={bank}
                    editMode={editMode}
                    onChange={(field, value) => updateNestedBank("family", member.id, bank.id, field, value)}
                    onCopy={copyValue}
                    title={bank.bankName || bank.accountHolder || "Bank Account"}
                    onFieldRemove={(field) => updateNestedBank("family", member.id, bank.id, field, "")}
                  />
                ))}
                <DocumentList
                  documents={vault.documents.filter((entry) => member.documentIds.includes(entry.id))}
                  onDownload={handleDownload}
                  onDelete={removeDocument}
                  editMode={editMode}
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
            editMode={editMode}
            renderItem={(account) => (
              <ItemSection
                data={account}
                editMode={editMode}
                onChange={(field, value) => updateListItem("bankAccounts", account.id, field, value)}
                onCopy={copyValue}
                title={account.bankName || account.accountHolder || "Bank Account"}
                onAddField={() => addCustomFieldToItem("bankAccounts", account.id)}
                onCustomFieldChange={(fieldId, key, value) =>
                  updateCustomFieldInItem("bankAccounts", account.id, fieldId, key, value)
                }
                onCustomFieldRemove={(fieldId) =>
                  removeCustomFieldFromItem("bankAccounts", account.id, fieldId)
                }
                onFieldRemove={(field) => updateListItem("bankAccounts", account.id, field, "")}
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
            <DocumentList
              documents={vault.documents}
              onDownload={handleDownload}
              onDelete={removeDocument}
              editMode={editMode}
            />
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
            editMode={editMode}
            renderItem={(certificate) => (
              <div className="section-stack">
                <ItemSection
                  data={certificate}
                  editMode={editMode}
                  onChange={(field, value) => updateListItem("certificates", certificate.id, field, value)}
                  onCopy={copyValue}
                  title={certificate.name || "Certificate"}
                  onAddField={() => addCustomFieldToItem("certificates", certificate.id)}
                  onCustomFieldChange={(fieldId, key, value) =>
                    updateCustomFieldInItem("certificates", certificate.id, fieldId, key, value)
                  }
                  onCustomFieldRemove={(fieldId) =>
                    removeCustomFieldFromItem("certificates", certificate.id, fieldId)
                  }
                  onFieldRemove={(field) => updateListItem("certificates", certificate.id, field, "")}
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
                  editMode={editMode}
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
            editMode={editMode}
            renderItem={(achievement) => (
              <ItemSection
                data={achievement}
                editMode={editMode}
                onChange={(field, value) => updateListItem("achievements", achievement.id, field, value)}
                onCopy={copyValue}
                title={achievement.title || "Achievement"}
                onAddField={() => addCustomFieldToItem("achievements", achievement.id)}
                onCustomFieldChange={(fieldId, key, value) =>
                  updateCustomFieldInItem("achievements", achievement.id, fieldId, key, value)
                }
                onCustomFieldRemove={(fieldId) =>
                  removeCustomFieldFromItem("achievements", achievement.id, fieldId)
                }
                onFieldRemove={(field) => updateListItem("achievements", achievement.id, field, "")}
              />
            )}
          />
        )}

      </main>
    </div>
  );
}

function ObjectSection({
  title,
  data,
  editMode,
  onChange,
  onCopy,
  onAddField,
  onCustomFieldChange,
  onCustomFieldRemove,
  onFieldRemove,
}) {
  return (
    <section className="section-stack">
      <div className="subsection-header">
        <h3>{title}</h3>
        <button className="ghost-button" type="button" onClick={onAddField}>
          Add Field
        </button>
      </div>
      <FieldGrid
        data={data}
        editMode={editMode}
        onChange={onChange}
        onCopy={onCopy}
        onRemoveField={onFieldRemove}
      />
      <CustomFields
        fields={data.customFields || []}
        editMode={editMode}
        onCopy={onCopy}
        onChange={onCustomFieldChange}
        onRemove={onCustomFieldRemove}
      />
    </section>
  );
}

function ItemSection({
  title,
  data,
  editMode,
  onChange,
  onCopy,
  onAddField,
  onCustomFieldChange,
  onCustomFieldRemove,
  onFieldRemove,
}) {
  return (
    <section className="section-stack">
      {title ? (
        <div className="subsection-header compact">
          <h4>{title}</h4>
          {onAddField ? (
            <button className="ghost-button" type="button" onClick={onAddField}>
              Add Field
            </button>
          ) : null}
        </div>
      ) : null}
      <FieldGrid
        data={data}
        editMode={editMode}
        onChange={onChange}
        onCopy={onCopy}
        onRemoveField={onFieldRemove}
      />
      {onAddField ? (
        <CustomFields
          fields={data.customFields || []}
          editMode={editMode}
          onCopy={onCopy}
          onChange={onCustomFieldChange}
          onRemove={onCustomFieldRemove}
        />
      ) : null}
    </section>
  );
}

function FieldGrid({ data, editMode, onChange, onCopy, onRemoveField }) {
  return (
    <div className="field-grid">
      {Object.entries(data)
        .filter(([field]) => field !== "customFields")
        .map(([field, value]) => (
        <label className="field-card" key={field}>
          <div className="field-header">
            <span>{toLabel(field)}</span>
            {editMode ? (
              <button className="icon-button danger" type="button" onClick={() => onRemoveField?.(field)}>
                🗑
              </button>
            ) : null}
          </div>
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

function CustomFields({ fields, editMode, onCopy, onChange, onRemove }) {
  if (!fields.length) {
    return null;
  }

  return (
    <div className="field-grid">
      {fields.map((field) => (
        <article className="field-card" key={field.id}>
          <div className="custom-field-header">
            {editMode ? (
              <input
                className="custom-label-input"
                value={field.label}
                onChange={(event) => onChange(field.id, "label", event.target.value)}
              />
            ) : (
              <span>{field.label || "Custom field"}</span>
            )}
            {editMode ? (
              <button className="icon-button danger" type="button" onClick={() => onRemove(field.id)}>
                🗑
              </button>
            ) : null}
          </div>
          <div className="field-row">
            {editMode ? (
              <textarea
                rows={String(field.value ?? "").length > 60 ? 4 : 1}
                value={String(field.value ?? "")}
                onChange={(event) => onChange(field.id, "value", event.target.value)}
              />
            ) : (
              <div className="field-value">{String(field.value || "Not set")}</div>
            )}
            <button className="copy-button" type="button" onClick={() => onCopy(field.value)}>
              Copy
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function RepeatableSection({ title, items, addLabel, onAdd, onRemove, onCopy, renderItem, editMode }) {
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
              {editMode ? (
                <button className="icon-button danger" type="button" onClick={() => onRemove(item.id)}>
                  🗑
                </button>
              ) : null}
            </div>
          </div>
          {renderItem(item)}
        </article>
      ))}
    </section>
  );
}

function DocumentList({ documents, onDownload, onDelete, editMode }) {
  if (!documents.length) {
    return <div className="empty-state">No documents uploaded yet.</div>;
  }

  return (
    <div className="document-list">
      {documents.map((entry) => (
        <article className="document-card" key={entry.id}>
          <div>
            <h4>{entry.displayName || entry.name}</h4>
            <p>
              {entry.category} | {formatFileSize(entry.size)}
            </p>
          </div>
          <div className="inline-actions">
            <button className="ghost-button" type="button" onClick={() => onDownload(entry)}>
              Download
            </button>
            {editMode ? (
              <button className="icon-button danger" type="button" onClick={() => onDelete(entry.id)}>
                🗑
              </button>
            ) : null}
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

async function askForDocumentName(target, fallbackName) {
  const promptLabel =
    target.kind === "certificate" ? "Enter certificate name" : target.kind === "id" ? "Enter ID name" : "Enter document name";
  return window.prompt(promptLabel, fallbackName)?.trim() || "";
}
