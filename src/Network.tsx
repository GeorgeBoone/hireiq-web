// src/Network.tsx
import { useState, useEffect, useRef } from "react";
import type { Job, Contact, CompanySummary, CompanyDetail, ImportResult } from "./api";
import {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  getCompanies,
  getCompanyDetail,
  importLinkedInCSV,
} from "./api";

interface NetworkProps {
  token: string;
  onViewJob: (job: Job) => void;
}

type SubView = "companies" | "contacts";

const CONNECTION_OPTIONS = ["1st", "2nd", "3rd"];

const EMPTY_FORM = {
  name: "",
  company: "",
  role: "",
  connection: "3rd",
  phone: "",
  email: "",
  tip: "",
};

export default function Network({ token, onViewJob }: NetworkProps) {
  const [subView, setSubView] = useState<SubView>("companies");
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Company detail
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [companyDetail, setCompanyDetail] = useState<CompanyDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Contact form
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formSaving, setFormSaving] = useState(false);
  const [prefilledCompany, setPrefilledCompany] = useState("");

  // LinkedIn import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Load data on mount and sub-view change
  useEffect(() => {
    if (subView === "companies") {
      loadCompanies();
    } else {
      loadContacts();
    }
  }, [subView]);

  async function loadCompanies() {
    setLoading(true);
    setError(null);
    try {
      const data = await getCompanies(token);
      setCompanies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadContacts(searchTerm?: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await getContacts(token, searchTerm || undefined);
      setContacts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  // Debounced search for contacts
  useEffect(() => {
    if (subView !== "contacts") return;
    const timeout = setTimeout(() => loadContacts(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  async function openCompanyDetail(company: string) {
    if (selectedCompany === company) {
      setSelectedCompany(null);
      setCompanyDetail(null);
      return;
    }
    setSelectedCompany(company);
    setDetailLoading(true);
    try {
      const data = await getCompanyDetail(token, company);
      setCompanyDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetailLoading(false);
    }
  }

  function openAddForm(company?: string) {
    setEditingContact(null);
    setForm({ ...EMPTY_FORM, company: company || "" });
    setPrefilledCompany(company || "");
    setShowForm(true);
  }

  function openEditForm(contact: Contact) {
    setEditingContact(contact);
    setForm({
      name: contact.name,
      company: contact.company,
      role: contact.role,
      connection: contact.connection || "3rd",
      phone: contact.phone,
      email: contact.email,
      tip: contact.tip,
    });
    setPrefilledCompany("");
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingContact(null);
    setForm(EMPTY_FORM);
    setPrefilledCompany("");
  }

  async function saveForm() {
    if (!form.name.trim() || !form.company.trim()) return;
    setFormSaving(true);
    try {
      if (editingContact) {
        await updateContact(token, editingContact.id, form);
      } else {
        await createContact(token, form);
      }
      cancelForm();
      // Refresh both views
      if (subView === "contacts") loadContacts(search);
      if (selectedCompany) {
        const data = await getCompanyDetail(token, selectedCompany);
        setCompanyDetail(data);
      }
      // Also refresh companies to update contact counts
      loadCompanies();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setFormSaving(false);
    }
  }

  async function handleLinkedInImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset the input so the same file can be re-selected
    e.target.value = "";
    setImporting(true);
    setImportResult(null);
    setError(null);
    try {
      const result = await importLinkedInCSV(token, file);
      setImportResult(result);
      // Refresh contacts list
      if (subView === "contacts") loadContacts(search);
      loadCompanies();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  }

  async function handleDeleteContact(contact: Contact) {
    if (!confirm(`Delete contact "${contact.name}"?`)) return;
    try {
      await deleteContact(token, contact.id);
      if (subView === "contacts") loadContacts(search);
      if (selectedCompany) {
        const data = await getCompanyDetail(token, selectedCompany);
        setCompanyDetail(data);
      }
      loadCompanies();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  // Unique company names for autocomplete
  const companyNames = companies.map((c) => c.company);

  // ── Styles ──────────────────────────────────────
  const glassCard: React.CSSProperties = {
    background: "var(--glass-bg)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--glass-border)",
    padding: 24,
    boxShadow: "var(--shadow-sm)",
  };

  const pillActive: React.CSSProperties = {
    padding: "7px 20px",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--accent)",
    background: "var(--accent-light)",
    border: "1px solid rgba(129, 140, 248, 0.1)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontFamily: "inherit",
  };

  const pillInactive: React.CSSProperties = {
    ...pillActive,
    color: "var(--text-muted)",
    background: "transparent",
    border: "1px solid transparent",
  };

  const labelStyle: React.CSSProperties = {
    fontWeight: 600,
    fontSize: 12,
    color: "var(--text-secondary)",
    marginBottom: 4,
    display: "block",
  };

  // ── Render ──────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
          Network
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Manage your professional contacts and company connections
        </p>
      </div>

      {/* Sub-view toggle + search */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            gap: 2,
            background: "rgba(200, 210, 240, 0.03)",
            border: "1px solid var(--glass-border)",
            borderRadius: 10,
            padding: 3,
          }}
        >
          <button
            onClick={() => { setSubView("companies"); setSelectedCompany(null); setCompanyDetail(null); }}
            style={subView === "companies" ? pillActive : pillInactive}
          >
            Companies
          </button>
          <button
            onClick={() => setSubView("contacts")}
            style={subView === "contacts" ? pillActive : pillInactive}
          >
            Contacts
          </button>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={subView === "companies" ? "Search companies..." : "Search contacts..."}
          style={{ flex: 1, maxWidth: 320 }}
        />

        {/* Add Contact + Import buttons */}
        {subView === "contacts" && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              style={{
                padding: "8px 16px",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-secondary)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "var(--radius-sm)",
                fontWeight: 600,
                fontSize: 13,
                fontFamily: "inherit",
                cursor: importing ? "wait" : "pointer",
                opacity: importing ? 0.6 : 1,
              }}
            >
              {importing ? "Importing..." : "Import LinkedIn"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={handleLinkedInImport}
            />
            <button
              onClick={() => openAddForm()}
              style={{
                padding: "8px 20px",
                background: "linear-gradient(135deg, #818cf8, #6366f1)",
                color: "white",
                border: "none",
                borderRadius: "var(--radius-sm)",
                fontWeight: 600,
                fontSize: 13,
                fontFamily: "inherit",
                cursor: "pointer",
                boxShadow: "0 2px 12px rgba(129, 140, 248, 0.2)",
              }}
            >
              + Add Contact
            </button>
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: "10px 16px",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.15)",
            borderRadius: "var(--radius-sm)",
            color: "var(--danger)",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {importResult && (
        <div
          style={{
            padding: "10px 16px",
            background: "rgba(34, 197, 94, 0.08)",
            border: "1px solid rgba(34, 197, 94, 0.15)",
            borderRadius: "var(--radius-sm)",
            color: "#22c55e",
            fontSize: 13,
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>
            Imported <strong>{importResult.imported}</strong> contacts
            {importResult.skipped > 0 && <> &middot; {importResult.skipped} duplicates skipped</>}
            {importResult.parseErrors > 0 && <> &middot; {importResult.parseErrors} rows skipped (missing data)</>}
          </span>
          <button
            onClick={() => setImportResult(null)}
            style={{
              background: "none",
              border: "none",
              color: "#22c55e",
              cursor: "pointer",
              fontSize: 16,
              padding: "0 4px",
              fontFamily: "inherit",
            }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Contact Form (inline, shown at top) */}
      {showForm && (
        <div style={{ ...glassCard, marginBottom: 20, border: "1px solid rgba(129, 140, 248, 0.15)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
            {editingContact ? "Edit Contact" : "Add Contact"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contact name"
              />
            </div>
            <div>
              <label style={labelStyle}>Company *</label>
              <input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Company name"
                list="company-suggestions"
                disabled={!!prefilledCompany}
              />
              <datalist id="company-suggestions">
                {companyNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <div>
              <label style={labelStyle}>Role</label>
              <input
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="e.g. Engineering Manager"
              />
            </div>
            <div>
              <label style={labelStyle}>Connection</label>
              <select
                value={form.connection}
                onChange={(e) => setForm({ ...form, connection: e.target.value })}
              >
                {CONNECTION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} degree
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Tip / Note</label>
              <input
                value={form.tip}
                onChange={(e) => setForm({ ...form, tip: e.target.value })}
                placeholder="e.g. Met at tech conference, interested in referrals"
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button
              onClick={saveForm}
              disabled={formSaving || !form.name.trim() || !form.company.trim()}
              style={{
                padding: "8px 24px",
                background: "linear-gradient(135deg, #818cf8, #6366f1)",
                color: "white",
                border: "none",
                borderRadius: "var(--radius-sm)",
                fontWeight: 600,
                fontSize: 13,
                fontFamily: "inherit",
                cursor: formSaving ? "wait" : "pointer",
                opacity: formSaving || !form.name.trim() || !form.company.trim() ? 0.5 : 1,
              }}
            >
              {formSaving ? "Saving..." : editingContact ? "Update" : "Add Contact"}
            </button>
            <button
              onClick={cancelForm}
              style={{
                padding: "8px 20px",
                background: "transparent",
                border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-muted)",
                fontWeight: 500,
                fontSize: 13,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)", fontSize: 14 }}>
          Loading...
        </div>
      )}

      {/* ── Companies View ────────────────────── */}
      {!loading && subView === "companies" && (() => {
        const filtered = companies.filter(
          (c) => !search || c.company.toLowerCase().includes(search.toLowerCase())
        );
        return (
          <>
            {filtered.length === 0 && !search ? (
              <div style={{ ...glassCard, textAlign: "center", padding: 60 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🏢</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
                  No companies yet
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
                  Companies appear here when you save jobs in the Tracker
                </div>
              </div>
            ) : filtered.length === 0 && search ? (
              <div style={{ ...glassCard, textAlign: "center", padding: 40 }}>
                <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
                  No companies matching "{search}"
                </div>
              </div>
            ) : (
              <>
                {/* Company Cards Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: 14,
                  }}
                >
                  {filtered.map((company) => {
                    const isSelected = selectedCompany === company.company;
                    return (
                      <div
                        key={company.company}
                        onClick={() => openCompanyDetail(company.company)}
                        style={{
                          ...glassCard,
                          padding: 20,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          border: isSelected
                            ? "1px solid rgba(129, 140, 248, 0.35)"
                            : "1px solid var(--glass-border)",
                          boxShadow: isSelected
                            ? "0 0 24px rgba(129, 140, 248, 0.1), 0 4px 16px rgba(0,0,0,0.15)"
                            : "var(--shadow-sm)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          textAlign: "center",
                          gap: 12,
                        }}
                      >
                        {/* Logo / Initial */}
                        {company.companyLogo ? (
                          <img
                            src={company.companyLogo}
                            alt=""
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 12,
                              objectFit: "contain",
                              background: "rgba(255,255,255,0.06)",
                              padding: 4,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 12,
                              background:
                                company.companyColor ||
                                "linear-gradient(135deg, #818cf8, #6366f1)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "white",
                              fontWeight: 700,
                              fontSize: 20,
                            }}
                          >
                            {company.company[0]?.toUpperCase()}
                          </div>
                        )}

                        {/* Company Name */}
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            lineHeight: 1.3,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            width: "100%",
                          }}
                        >
                          {company.company}
                        </div>

                        {/* Stats */}
                        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-muted)" }}>
                          <span style={{
                            padding: "2px 8px",
                            background: "rgba(200, 210, 240, 0.06)",
                            borderRadius: 8,
                            border: "1px solid rgba(150, 170, 220, 0.06)",
                          }}>
                            {company.jobCount} job{company.jobCount !== 1 ? "s" : ""}
                          </span>
                          <span style={{
                            padding: "2px 8px",
                            background: company.contactCount > 0
                              ? "rgba(16, 185, 129, 0.08)"
                              : "rgba(200, 210, 240, 0.06)",
                            borderRadius: 8,
                            border: company.contactCount > 0
                              ? "1px solid rgba(16, 185, 129, 0.1)"
                              : "1px solid rgba(150, 170, 220, 0.06)",
                            color: company.contactCount > 0 ? "#10b981" : undefined,
                          }}>
                            {company.contactCount} contact{company.contactCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Company Detail Panel (full-width, below grid) */}
                {selectedCompany && (
                  <div
                    style={{
                      ...glassCard,
                      marginTop: 20,
                      border: "1px solid rgba(129, 140, 248, 0.15)",
                    }}
                  >
                    {/* Detail Header */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 20,
                      paddingBottom: 16,
                      borderBottom: "1px solid rgba(150, 170, 220, 0.08)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        {(() => {
                          const c = companies.find((co) => co.company === selectedCompany);
                          return c?.companyLogo ? (
                            <img
                              src={c.companyLogo}
                              alt=""
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                objectFit: "contain",
                                background: "rgba(255,255,255,0.06)",
                                padding: 3,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background:
                                  c?.companyColor ||
                                  "linear-gradient(135deg, #818cf8, #6366f1)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontWeight: 700,
                                fontSize: 17,
                              }}
                            >
                              {selectedCompany[0]?.toUpperCase()}
                            </div>
                          );
                        })()}
                        <div>
                          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>
                            {selectedCompany}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => { setSelectedCompany(null); setCompanyDetail(null); }}
                        style={{
                          width: 30,
                          height: 30,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "transparent",
                          border: "1px solid var(--glass-border)",
                          borderRadius: 8,
                          color: "var(--text-muted)",
                          fontSize: 14,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    {detailLoading ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: 32,
                          color: "var(--text-muted)",
                          fontSize: 14,
                        }}
                      >
                        Loading...
                      </div>
                    ) : companyDetail ? (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                        {/* Jobs Column */}
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--text-secondary)",
                              marginBottom: 10,
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Jobs ({companyDetail.jobs.length})
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {companyDetail.jobs.map((job) => (
                              <div
                                key={job.id}
                                onClick={() => onViewJob(job)}
                                style={{
                                  padding: "10px 14px",
                                  background: "rgba(200, 210, 240, 0.04)",
                                  border: "1px solid rgba(150, 170, 220, 0.08)",
                                  borderRadius: "var(--radius-sm)",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  transition: "background 0.15s",
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      fontSize: 14,
                                      fontWeight: 600,
                                      color: "var(--text-primary)",
                                    }}
                                  >
                                    {job.title}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: "var(--text-muted)",
                                      marginTop: 2,
                                    }}
                                  >
                                    {job.location} · {job.status}
                                  </div>
                                </div>
                                {job.matchScore > 0 && (
                                  <div
                                    style={{
                                      padding: "3px 10px",
                                      background: "var(--accent-light)",
                                      color: "var(--accent)",
                                      borderRadius: 12,
                                      fontSize: 12,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {job.matchScore}%
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Contacts Column */}
                        <div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: 10,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "var(--text-secondary)",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                              }}
                            >
                              Contacts ({companyDetail.contacts.length})
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openAddForm(selectedCompany);
                              }}
                              style={{
                                padding: "4px 12px",
                                background: "transparent",
                                border: "1px solid rgba(129, 140, 248, 0.15)",
                                borderRadius: "var(--radius-sm)",
                                color: "var(--accent)",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              + Add
                            </button>
                          </div>
                          {companyDetail.contacts.length === 0 ? (
                            <div
                              style={{
                                padding: "24px 0",
                                color: "var(--text-muted)",
                                fontSize: 13,
                                textAlign: "center",
                              }}
                            >
                              No contacts yet for this company
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                              }}
                            >
                              {companyDetail.contacts.map((contact) => (
                                <ContactCard
                                  key={contact.id}
                                  contact={contact}
                                  onEdit={() => openEditForm(contact)}
                                  onDelete={() => handleDeleteContact(contact)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </>
            )}
          </>
        );
      })()}

      {/* ── Contacts View ─────────────────────── */}
      {!loading && subView === "contacts" && (
        <>
          {contacts.length === 0 && !search ? (
            <div style={{ ...glassCard, textAlign: "center", padding: 60 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>👤</div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: 6,
                }}
              >
                No contacts yet
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 20 }}>
                Add your professional contacts or import them from LinkedIn
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  style={{
                    padding: "10px 24px",
                    background: "rgba(255,255,255,0.04)",
                    color: "var(--text-secondary)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 600,
                    fontSize: 14,
                    fontFamily: "inherit",
                    cursor: importing ? "wait" : "pointer",
                    opacity: importing ? 0.6 : 1,
                  }}
                >
                  {importing ? "Importing..." : "Import LinkedIn CSV"}
                </button>
                <button
                  onClick={() => openAddForm()}
                  style={{
                    padding: "10px 24px",
                    background: "linear-gradient(135deg, #818cf8, #6366f1)",
                    color: "white",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 600,
                    fontSize: 14,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    boxShadow: "0 2px 12px rgba(129, 140, 248, 0.2)",
                  }}
                >
                  + Add Your First Contact
                </button>
              </div>
            </div>
          ) : contacts.length === 0 && search ? (
            <div style={{ ...glassCard, textAlign: "center", padding: 40 }}>
              <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
                No contacts matching "{search}"
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {contacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  showCompany
                  onEdit={() => openEditForm(contact)}
                  onDelete={() => handleDeleteContact(contact)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Contact Card Component ────────────────────────
function ContactCard({
  contact,
  showCompany,
  onEdit,
  onDelete,
}: {
  contact: Contact;
  showCompany?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const connectionColor =
    contact.connection === "1st"
      ? "#10b981"
      : contact.connection === "2nd"
        ? "#f59e0b"
        : "var(--text-muted)";

  return (
    <div
      style={{
        padding: "12px 16px",
        background: "rgba(200, 210, 240, 0.04)",
        border: "1px solid rgba(150, 170, 220, 0.08)",
        borderRadius: "var(--radius-sm)",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: "linear-gradient(135deg, rgba(129, 140, 248, 0.15), rgba(99, 102, 241, 0.1))",
          border: "1px solid rgba(129, 140, 248, 0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--accent)",
          fontWeight: 700,
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        {contact.name[0]?.toUpperCase()}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {contact.name}
          </span>
          <span
            style={{
              padding: "1px 8px",
              fontSize: 11,
              fontWeight: 600,
              color: connectionColor,
              background:
                contact.connection === "1st"
                  ? "rgba(16, 185, 129, 0.1)"
                  : contact.connection === "2nd"
                    ? "rgba(245, 158, 11, 0.1)"
                    : "rgba(200, 210, 240, 0.06)",
              borderRadius: 10,
              border: `1px solid ${contact.connection === "1st" ? "rgba(16, 185, 129, 0.15)" : contact.connection === "2nd" ? "rgba(245, 158, 11, 0.15)" : "rgba(150, 170, 220, 0.08)"}`,
            }}
          >
            {contact.connection}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
          {contact.role && <span>{contact.role}</span>}
          {contact.role && showCompany && <span> at </span>}
          {showCompany && (
            <span style={{ fontWeight: 500 }}>{contact.company}</span>
          )}
        </div>
        {contact.tip && (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginTop: 4,
              fontStyle: "italic",
              opacity: 0.8,
            }}
          >
            {contact.tip}
          </div>
        )}
      </div>

      {/* Contact info icons */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            title={contact.email}
            onClick={(e) => e.stopPropagation()}
            style={{
              color: "var(--text-muted)",
              fontSize: 16,
              textDecoration: "none",
            }}
          >
            ✉
          </a>
        )}
        {contact.phone && (
          <a
            href={`tel:${contact.phone}`}
            title={contact.phone}
            onClick={(e) => e.stopPropagation()}
            style={{
              color: "var(--text-muted)",
              fontSize: 16,
              textDecoration: "none",
            }}
          >
            📞
          </a>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          title="Edit"
          style={{
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "1px solid rgba(150, 170, 220, 0.08)",
            borderRadius: 6,
            color: "var(--text-muted)",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          ✎
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete"
          style={{
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "1px solid rgba(239, 68, 68, 0.1)",
            borderRadius: 6,
            color: "rgba(239, 68, 68, 0.7)",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
