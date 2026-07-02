import { useEffect, useMemo, useRef, useState } from "react";
import {
  createCustomField,
  createBankAccount,
  createCertificate,
  createDefaultVault,
  createFamilyMember,
  createOtherSection,
  createOtherSubsection,
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
const vaultTitle = "Private Personal Vault";
const searchHint = "Search mother, aadhaar, resume, college email...";

export default function App() {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPin, setNewUserPin] = useState("");
  const [vault, setVault] = useState(null);
  const [activeSection, setActiveSection] = useState("personalInfo");
  const [editMode, setEditMode] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [, setSaving] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState(null);
  const toastTimerRef = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());
  const savingCountRef = useRef(0);
  const adminEmail = "admin@gmail.com";

  useEffect(() => {
    async function bootstrap() {
      try {
        const session = await getSessionUser();
        const payload = await loadVault();
        setUserEmail(session.email);
        setEmail(session.email);
        setVault(payload.vault || createDefaultVault());
        setSessionExpiresAt(Date.now() + 30 * 60 * 1000);
      } catch {
        setVault(null);
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, []);

  useEffect(() => {
    if (!sessionExpiresAt) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      handleLogout();
    }, Math.max(sessionExpiresAt - Date.now(), 0));

    return () => window.clearTimeout(timeout);
  }, [sessionExpiresAt]);

  useEffect(
    () => () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    },
    [],
  );

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

  function showToast(message, type = "info") {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    setToast({ message, type });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      await loginUser(normalizedEmail, pin);
      showToast("Signed in.");

      const payload = await loadVault();
      setVault(payload.vault || createDefaultVault());
      setUserEmail(normalizedEmail);
      setEmail(normalizedEmail);
      setPin("");
      setSessionExpiresAt(Date.now() + 30 * 60 * 1000);
    } catch (error) {
      showToast(error.message || "Authentication failed.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(event) {
    event.preventDefault();

    try {
      const normalizedEmail = newUserEmail.trim().toLowerCase();
      await registerUser(normalizedEmail, newUserPin);
      setNewUserEmail("");
      setNewUserPin("");
      showToast("User created.", "success");
    } catch (error) {
      showToast(error.message || "User creation failed.", "error");
    }
  }

  async function persistVault(nextVault, nextStatus = "Changes saved.") {
    setVault(nextVault);
    showToast("Saving to MongoDB...");
    savingCountRef.current += 1;
    setSaving(true);

    saveQueueRef.current = saveQueueRef.current
      .then(() => saveVault(nextVault))
      .then(() => {
        showToast(nextStatus, "success");
      })
      .catch((error) => {
        showToast(error.message || "Save failed.", "error");
      })
      .finally(() => {
        savingCountRef.current -= 1;
        setSaving(savingCountRef.current > 0);
      });

    await saveQueueRef.current;
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

  function renameGroupField(group, field, label) {
    persistVault({
      ...vault,
      [group]: {
        ...vault[group],
        fieldLabels: {
          ...(vault[group].fieldLabels || {}),
          [field]: label,
        },
      },
    });
  }

  function removeFieldFromGroup(group, field) {
    const nextGroup = { ...vault[group] };
    delete nextGroup[field];
    persistVault({
      ...vault,
      [group]: nextGroup,
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

  function renameCustomFieldInGroup(group, fieldId, label) {
    persistVault({
      ...vault,
      [group]: {
        ...vault[group],
        customFields: (vault[group].customFields || []).map((field) =>
          field.id === fieldId ? { ...field, label } : field,
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

  function renameListItemField(group, itemId, field, label) {
    persistVault({
      ...vault,
      [group]: vault[group].map((item) =>
        item.id === itemId
          ? {
              ...item,
              fieldLabels: {
                ...(item.fieldLabels || {}),
                [field]: label,
              },
            }
          : item,
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

  function renameCustomFieldInItem(group, itemId, fieldId, label) {
    persistVault({
      ...vault,
      [group]: vault[group].map((item) =>
        item.id === itemId
          ? {
              ...item,
              customFields: (item.customFields || []).map((field) =>
                field.id === fieldId ? { ...field, label } : field,
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

  function removeFieldFromItem(group, itemId, field) {
    persistVault({
      ...vault,
      [group]: vault[group].map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        const nextItem = { ...item };
        delete nextItem[field];
        return nextItem;
      }),
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

  function removeFamilyMember(memberId) {
    removeListItem("family", memberId);
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

  function removeNestedBankField(ownerGroup, ownerId, bankId, field) {
    persistVault({
      ...vault,
      [ownerGroup]: vault[ownerGroup].map((item) => {
        if (item.id !== ownerId) {
          return item;
        }

        return {
          ...item,
          bankAccounts: item.bankAccounts.map((bank) => {
            if (bank.id !== bankId) {
              return bank;
            }

            const nextBank = { ...bank };
            delete nextBank[field];
            return nextBank;
          }),
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

  function updateOtherSection(sectionId, field, value) {
    persistVault({
      ...vault,
      others: vault.others.map((section) =>
        section.id === sectionId ? { ...section, [field]: value } : section,
      ),
    });
  }

  function renameOtherSectionField(sectionId, field, label) {
    persistVault({
      ...vault,
      others: vault.others.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              fieldLabels: {
                ...(section.fieldLabels || {}),
                [field]: label,
              },
            }
          : section,
      ),
    });
  }

  function removeOtherSection(sectionId) {
    persistVault({
      ...vault,
      others: vault.others.filter((section) => section.id !== sectionId),
    });
  }

  function addOtherSection() {
    persistVault({
      ...vault,
      others: [...vault.others, createOtherSection()],
    });
  }

  function addOtherSubsection(sectionId) {
    persistVault({
      ...vault,
      others: vault.others.map((section) =>
        section.id === sectionId
          ? { ...section, subsections: [...section.subsections, createOtherSubsection()] }
          : section,
      ),
    });
  }

  function updateOtherSubsection(sectionId, subsectionId, field, value) {
    persistVault({
      ...vault,
      others: vault.others.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              subsections: section.subsections.map((subsection) =>
                subsection.id === subsectionId ? { ...subsection, [field]: value } : subsection,
              ),
            }
          : section,
      ),
    });
  }

  function renameOtherSubsectionField(sectionId, subsectionId, field, label) {
    persistVault({
      ...vault,
      others: vault.others.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              subsections: section.subsections.map((subsection) =>
                subsection.id === subsectionId
                  ? {
                      ...subsection,
                      fieldLabels: {
                        ...(subsection.fieldLabels || {}),
                        [field]: label,
                      },
                    }
                  : subsection,
              ),
            }
          : section,
      ),
    });
  }

  function removeOtherSubsection(sectionId, subsectionId) {
    persistVault({
      ...vault,
      others: vault.others.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              subsections: section.subsections.filter((subsection) => subsection.id !== subsectionId),
            }
          : section,
      ),
    });
  }

  function addOtherField(sectionId, subsectionId) {
    persistVault({
      ...vault,
      others: vault.others.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              subsections: section.subsections.map((subsection) =>
                subsection.id === subsectionId
                  ? {
                      ...subsection,
                      fields: [...subsection.fields, createCustomField("Field name", "")],
                    }
                  : subsection,
              ),
            }
          : section,
      ),
    });
  }

  function updateOtherField(sectionId, subsectionId, fieldId, key, value) {
    persistVault({
      ...vault,
      others: vault.others.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              subsections: section.subsections.map((subsection) =>
                subsection.id === subsectionId
                  ? {
                      ...subsection,
                      fields: subsection.fields.map((field) =>
                        field.id === fieldId ? { ...field, [key]: value } : field,
                      ),
                    }
                  : subsection,
              ),
            }
          : section,
      ),
    });
  }

  function removeOtherField(sectionId, subsectionId, fieldId) {
    persistVault({
      ...vault,
      others: vault.others.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              subsections: section.subsections.map((subsection) =>
                subsection.id === subsectionId
                  ? {
                      ...subsection,
                      fields: subsection.fields.filter((field) => field.id !== fieldId),
                    }
                  : subsection,
              ),
            }
          : section,
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

      if (target.kind === "otherSection") {
        nextVault.others = vault.others.map((section) =>
          section.id === target.linkedTo
            ? { ...section, documentIds: [...(section.documentIds || []), metadata.id] }
            : section,
        );
      }

      if (target.kind === "otherSubsection") {
        nextVault.others = vault.others.map((section) => ({
          ...section,
          subsections: section.subsections.map((subsection) =>
            subsection.id === target.linkedTo
              ? { ...subsection, documentIds: [...(subsection.documentIds || []), metadata.id] }
              : subsection,
          ),
        }));
      }

      await persistVault(nextVault, "Document uploaded.");
    } catch (error) {
      showToast(error.message || "Upload failed.", "error");
    }
    event.target.value = "";
  }

  async function handleDownload(fileRecord) {
    try {
      const blob = await downloadDocument(fileRecord.id);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = fileRecord.displayName || fileRecord.name || "download";
      anchor.click();
      URL.revokeObjectURL(url);
      showToast("Download started.");
    } catch (error) {
      showToast(error.message || "Download failed.", "error");
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
        family: vault.family.map((member) => ({
          ...member,
          documentIds: member.documentIds.filter((entryId) => entryId !== documentId),
        })),
      };

      await persistVault(nextVault, "Document removed.");
    } catch (error) {
      showToast(error.message || "Delete failed.", "error");
    }
  }

  async function copyValue(value) {
    try {
      await navigator.clipboard.writeText(String(value ?? ""));
      showToast("Copied.");
    } catch {
      showToast("Copy failed.", "error");
    }
  }

  async function handleLogout() {
    try {
      await logoutUser();
    } finally {
      setVault(null);
      setUserEmail("");
      setEmail("");
      setPin("");
      setNewUserEmail("");
      setNewUserPin("");
      setSearch("");
      setSessionExpiresAt(null);
      showToast("Signed out.");
    }
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
            <CopyButton value={JSON.stringify(vault, null, 2)} onCopy={copyValue} label="Copy All" />
            <button className="primary-button" type="button" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </header>

        {userEmail === adminEmail ? (
          <section className="panel">
            <div className="subsection-header">
              <h3>Create User</h3>
            </div>
            <form className="auth-form" onSubmit={handleCreateUser}>
              <input
                type="email"
                aria-label="New user email"
                placeholder="New user email"
                value={newUserEmail}
                onChange={(event) => setNewUserEmail(event.target.value)}
                required
              />
              <input
                type="password"
                aria-label="New user PIN"
                placeholder="6-digit PIN"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={newUserPin}
                onChange={(event) => setNewUserPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                required
              />
              <button className="primary-button" type="submit">
                Add User
              </button>
            </form>
          </section>
        ) : null}

        {toast ? <Toast message={toast.message} type={toast.type} /> : null}

        {activeSection === "personalInfo" && (
          <ObjectSection
            title={sectionLabels.personalInfo}
            data={vault.personalInfo}
            editMode={editMode}
            onChange={(field, value) => updateGroup("personalInfo", field, value)}
            onCopy={copyValue}
            onAddField={() => addCustomFieldToGroup("personalInfo")}
            onRenameField={(field, label) => renameGroupField("personalInfo", field, label)}
            onCustomFieldChange={(fieldId, key, value) =>
              updateCustomFieldInGroup("personalInfo", fieldId, key, value)
            }
            onCustomFieldRename={(fieldId, label) => renameCustomFieldInGroup("personalInfo", fieldId, label)}
            onCustomFieldRemove={(fieldId) => removeCustomFieldFromGroup("personalInfo", fieldId)}
            onFieldRemove={(field) => removeFieldFromGroup("personalInfo", field)}
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
            onRenameField={(field, label) => renameGroupField("contacts", field, label)}
            onCustomFieldChange={(fieldId, key, value) =>
              updateCustomFieldInGroup("contacts", fieldId, key, value)
            }
            onCustomFieldRename={(fieldId, label) => renameCustomFieldInGroup("contacts", fieldId, label)}
            onCustomFieldRemove={(fieldId) => removeCustomFieldFromGroup("contacts", fieldId)}
            onFieldRemove={(field) => removeFieldFromGroup("contacts", field)}
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
            onRenameField={(field, label) => renameGroupField("education", field, label)}
            onCustomFieldChange={(fieldId, key, value) =>
              updateCustomFieldInGroup("education", fieldId, key, value)
            }
            onCustomFieldRename={(fieldId, label) => renameCustomFieldInGroup("education", fieldId, label)}
            onCustomFieldRemove={(fieldId) => removeCustomFieldFromGroup("education", fieldId)}
            onFieldRemove={(field) => removeFieldFromGroup("education", field)}
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
            onRenameField={(field, label) => renameGroupField("college", field, label)}
            onCustomFieldChange={(fieldId, key, value) =>
              updateCustomFieldInGroup("college", fieldId, key, value)
            }
            onCustomFieldRename={(fieldId, label) => renameCustomFieldInGroup("college", fieldId, label)}
            onCustomFieldRemove={(fieldId) => removeCustomFieldFromGroup("college", fieldId)}
            onFieldRemove={(field) => removeFieldFromGroup("college", field)}
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
            onRenameField={(field, label) => renameGroupField("governmentIds", field, label)}
            onCustomFieldChange={(fieldId, key, value) =>
              updateCustomFieldInGroup("governmentIds", fieldId, key, value)
            }
            onCustomFieldRename={(fieldId, label) => renameCustomFieldInGroup("governmentIds", fieldId, label)}
            onCustomFieldRemove={(fieldId) => removeCustomFieldFromGroup("governmentIds", fieldId)}
            onFieldRemove={(field) => removeFieldFromGroup("governmentIds", field)}
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
            onRenameField={(field, label) => renameGroupField("socialLinks", field, label)}
            onCustomFieldChange={(fieldId, key, value) =>
              updateCustomFieldInGroup("socialLinks", fieldId, key, value)
            }
            onCustomFieldRename={(fieldId, label) => renameCustomFieldInGroup("socialLinks", fieldId, label)}
            onCustomFieldRemove={(fieldId) => removeCustomFieldFromGroup("socialLinks", fieldId)}
            onFieldRemove={(field) => removeFieldFromGroup("socialLinks", field)}
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
                  <h3>Family Member</h3>
                  <div className="inline-actions">
                    <CopyButton value={JSON.stringify(member, null, 2)} onCopy={copyValue} />
                    <label className="ghost-button upload-button">
                      Upload Document
                      <input
                        type="file"
                        hidden
                        onChange={(event) =>
                          handleFileUpload(event, {
                            kind: "family",
                            category: "Family member document",
                            linkedTo: member.id,
                          })
                        }
                      />
                    </label>
                    {editMode ? (
                      <button
                        className="icon-button danger"
                        type="button"
                        onClick={() => removeFamilyMember(member.id)}
                      >
                        🗑
                      </button>
                    ) : null}
                  </div>
                </div>
                <ItemSection
                  title="Details"
                  data={{
                    name: member.name,
                    mobile: member.mobile,
                    email: member.email,
                    aadhaarNumber: member.aadhaarNumber,
                    panNumber: member.panNumber,
                    notes: member.notes,
                    fieldLabels: member.fieldLabels,
                    customFields: member.customFields,
                  }}
                  editMode={editMode}
                  onChange={(field, value) => updateListItem("family", member.id, field, value)}
                  onCopy={copyValue}
                  onAddField={() => addCustomFieldToItem("family", member.id)}
                  onRenameField={(field, label) => renameListItemField("family", member.id, field, label)}
                  onCustomFieldChange={(fieldId, key, value) =>
                    updateCustomFieldInItem("family", member.id, fieldId, key, value)
                  }
                  onCustomFieldRename={(fieldId, label) =>
                    renameCustomFieldInItem("family", member.id, fieldId, label)
                  }
                  onCustomFieldRemove={(fieldId) =>
                    removeCustomFieldFromItem("family", member.id, fieldId)
                  }
                  onFieldRemove={(field) => removeFieldFromItem("family", member.id, field)}
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
                    onRenameField={(field, label) => renameListItemField("family", member.id, field, label)}
                    onCustomFieldRename={(fieldId, label) =>
                      renameCustomFieldInItem("family", member.id, fieldId, label)
                    }
                    onFieldRemove={(field) => removeNestedBankField("family", member.id, bank.id, field)}
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
                onRenameField={(field, label) => renameListItemField("bankAccounts", account.id, field, label)}
                onCustomFieldChange={(fieldId, key, value) =>
                  updateCustomFieldInItem("bankAccounts", account.id, fieldId, key, value)
                }
                onCustomFieldRename={(fieldId, label) =>
                  renameCustomFieldInItem("bankAccounts", account.id, fieldId, label)
                }
                onCustomFieldRemove={(fieldId) =>
                  removeCustomFieldFromItem("bankAccounts", account.id, fieldId)
                }
                onFieldRemove={(field) => removeFieldFromItem("bankAccounts", account.id, field)}
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
                  onRenameField={(field, label) => renameListItemField("certificates", certificate.id, field, label)}
                  onCustomFieldChange={(fieldId, key, value) =>
                    updateCustomFieldInItem("certificates", certificate.id, fieldId, key, value)
                  }
                  onCustomFieldRename={(fieldId, label) =>
                    renameCustomFieldInItem("certificates", certificate.id, fieldId, label)
                  }
                  onCustomFieldRemove={(fieldId) =>
                    removeCustomFieldFromItem("certificates", certificate.id, fieldId)
                  }
                  onFieldRemove={(field) => removeFieldFromItem("certificates", certificate.id, field)}
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

        {activeSection === "others" && (
          <section className="section-stack">
            <div className="subsection-header">
              <h3>Others</h3>
              <button className="primary-button" type="button" onClick={addOtherSection}>
                Add Section
              </button>
            </div>
            {vault.others.map((section, sectionIndex) => (
              <article className="panel" key={section.id}>
                <div className="panel-header">
                  {editMode ? (
                    <input
                      className="field-label-input"
                      defaultValue={section.title}
                      placeholder={`Section ${sectionIndex + 1}`}
                      onBlur={(event) => renameOtherSectionField(section.id, "title", event.target.value)}
                    />
                  ) : (
                    <h4>{section.title || `Section ${sectionIndex + 1}`}</h4>
                  )}
                  <div className="inline-actions">
                    <CopyButton value={JSON.stringify(section, null, 2)} onCopy={copyValue} />
                    <label className="ghost-button upload-button">
                      Upload Document
                      <input
                        type="file"
                        hidden
                        onChange={(event) =>
                          handleFileUpload(event, {
                            kind: "otherSection",
                            category: section.title || "Other section document",
                            linkedTo: section.id,
                          })
                        }
                      />
                    </label>
                    {editMode ? (
                      <button
                        className="icon-button danger"
                        type="button"
                        onClick={() => removeOtherSection(section.id)}
                      >
                        🗑
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="section-stack">
                  <div className="subsection-header compact">
                    <h4>Subsections</h4>
                    <button className="ghost-button" type="button" onClick={() => addOtherSubsection(section.id)}>
                      Add Subsection
                    </button>
                  </div>

                  {section.subsections.map((subsection, subsectionIndex) => (
                    <article className="panel" key={subsection.id}>
                      <div className="panel-header">
                        {editMode ? (
                          <input
                            className="field-label-input"
                            defaultValue={subsection.title}
                            placeholder={`Subsection ${subsectionIndex + 1}`}
                            onBlur={(event) =>
                              renameOtherSubsectionField(section.id, subsection.id, "title", event.target.value)
                            }
                          />
                        ) : (
                          <h5>{subsection.title || `Subsection ${subsectionIndex + 1}`}</h5>
                        )}
                        <div className="inline-actions">
                          <CopyButton value={JSON.stringify(subsection, null, 2)} onCopy={copyValue} />
                          <label className="ghost-button upload-button">
                            Upload Document
                            <input
                              type="file"
                              hidden
                              onChange={(event) =>
                                handleFileUpload(event, {
                                  kind: "otherSubsection",
                                  category: subsection.title || "Other subsection document",
                                  linkedTo: subsection.id,
                                })
                              }
                            />
                          </label>
                          {editMode ? (
                            <button
                              className="icon-button danger"
                              type="button"
                              onClick={() => removeOtherSubsection(section.id, subsection.id)}
                            >
                              🗑
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="subsection-header compact">
                        <span />
                        <button className="ghost-button" type="button" onClick={() => addOtherField(section.id, subsection.id)}>
                          Add Field
                        </button>
                      </div>
                      <CustomFields
                        fields={subsection.fields}
                        editMode={editMode}
                        onCopy={copyValue}
                        onChange={(fieldId, key, value) =>
                          updateOtherField(section.id, subsection.id, fieldId, key, value)
                        }
                        onRenameField={(fieldId, label) =>
                          updateOtherField(section.id, subsection.id, fieldId, "label", label)
                        }
                        onRemove={(fieldId) => removeOtherField(section.id, subsection.id, fieldId)}
                      />
                      <DocumentList
                        documents={vault.documents.filter((entry) =>
                          (section.documentIds || []).includes(entry.id) ||
                          (subsection.documentIds || []).includes(entry.id)
                        )}
                        onDownload={handleDownload}
                        onDelete={removeDocument}
                        editMode={editMode}
                      />
                    </article>
                  ))}
                </div>
              </article>
            ))}
          </section>
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
  onRenameField,
  onCustomFieldChange,
  onCustomFieldRename,
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
        onRenameField={onRenameField}
      />
      <CustomFields
        fields={data.customFields || []}
        editMode={editMode}
        onCopy={onCopy}
        onChange={onCustomFieldChange}
        onRenameField={onCustomFieldRename}
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
  onRenameField,
  onCustomFieldChange,
  onCustomFieldRename,
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
        onRenameField={onRenameField}
      />
      {onAddField ? (
        <CustomFields
          fields={data.customFields || []}
          editMode={editMode}
          onCopy={onCopy}
          onChange={onCustomFieldChange}
          onRenameField={onCustomFieldRename}
          onRemove={onCustomFieldRemove}
        />
      ) : null}
    </section>
  );
}

function FieldGrid({ data, editMode, onChange, onCopy, onRemoveField, onRenameField }) {
  return (
    <div className="field-grid">
      {Object.entries(data)
        .filter(([field]) => !["id", "relation", "customFields", "fieldLabels", "documentIds", "subsections"].includes(field))
        .map(([field, value]) => (
          <FieldCard
            key={field}
            field={field}
            value={value}
            editMode={editMode}
            label={data.fieldLabels?.[field] ?? toLabel(field)}
            onChange={onChange}
            onCopy={onCopy}
            onRemoveField={onRemoveField}
            onRenameField={onRenameField}
          />
        ))}
    </div>
  );
}

function CustomFields({ fields, editMode, onCopy, onChange, onRenameField, onRemove }) {
  if (!fields.length) {
    return null;
  }

  return (
    <div className="field-grid">
      {fields.map((field) => (
        <CustomFieldCard
          key={field.id}
          field={field}
          editMode={editMode}
          onCopy={onCopy}
          onChange={onChange}
          onRenameField={onRenameField}
          onRemove={onRemove}
        />
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
              <CopyButton value={JSON.stringify(item, null, 2)} onCopy={onCopy} />
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

function FieldCard({ field, value, label, editMode, onChange, onCopy, onRemoveField, onRenameField }) {
  const [labelDraft, setLabelDraft] = useState(label);
  const [valueDraft, setValueDraft] = useState(String(value ?? ""));

  useEffect(() => {
    setLabelDraft(label);
  }, [label]);

  useEffect(() => {
    setValueDraft(String(value ?? ""));
  }, [value]);

  function commitValue() {
    if (String(value ?? "") !== valueDraft) {
      onChange(field, valueDraft);
    }
  }

  function commitLabel() {
    if (onRenameField && labelDraft !== label) {
      onRenameField(field, labelDraft);
    }
  }

  return (
    <label className="field-card">
      <div className="field-header">
        {editMode ? (
          <input
            className="field-label-input"
            value={labelDraft}
            onChange={(event) => setLabelDraft(event.target.value)}
            onBlur={commitLabel}
          />
        ) : (
          <span>{label}</span>
        )}
        {editMode ? (
          <button className="icon-button danger" type="button" onClick={() => onRemoveField?.(field)}>
            🗑
          </button>
        ) : null}
      </div>
      <div className="field-row">
        {editMode ? (
          <textarea
            rows={String(valueDraft).length > 60 ? 4 : 1}
            value={valueDraft}
            onChange={(event) => setValueDraft(event.target.value)}
            onBlur={commitValue}
          />
        ) : (
          <div className="field-value">{String(value || "Not set")}</div>
        )}
        <CopyButton value={value} onCopy={onCopy} />
      </div>
    </label>
  );
}

function CustomFieldCard({ field, editMode, onCopy, onChange, onRenameField, onRemove }) {
  const [labelDraft, setLabelDraft] = useState(field.label || "");
  const [valueDraft, setValueDraft] = useState(String(field.value ?? ""));

  useEffect(() => {
    setLabelDraft(field.label || "");
  }, [field.label]);

  useEffect(() => {
    setValueDraft(String(field.value ?? ""));
  }, [field.value]);

  function commitLabel() {
    if (onRenameField && labelDraft !== field.label) {
      onRenameField(field.id, labelDraft);
    }
  }

  function commitValue() {
    if (valueDraft !== String(field.value ?? "")) {
      onChange(field.id, "value", valueDraft);
    }
  }

  return (
    <article className="field-card">
      <div className="custom-field-header">
        {editMode ? (
          <input
            className="custom-label-input"
            value={labelDraft}
            onChange={(event) => setLabelDraft(event.target.value)}
            onBlur={commitLabel}
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
            rows={String(valueDraft).length > 60 ? 4 : 1}
            value={valueDraft}
            onChange={(event) => setValueDraft(event.target.value)}
            onBlur={commitValue}
          />
        ) : (
          <div className="field-value">{String(field.value || "Not set")}</div>
        )}
        <CopyButton value={field.value} onCopy={onCopy} />
      </div>
    </article>
  );
}

function CopyButton({ value, onCopy, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(
    () => () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    },
    [],
  );

  async function handleClick() {
    if (copied) {
      return;
    }

    await onCopy(value);
    setCopied(true);
    timerRef.current = window.setTimeout(() => {
      setCopied(false);
    }, 1000);
  }

  return (
    <button className="copy-button" type="button" onClick={handleClick} disabled={copied}>
      {copied ? "Copied" : label}
    </button>
  );
}

function Toast({ message, type }) {
  return <div className={`toast toast-${type}`}>{message}</div>;
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
