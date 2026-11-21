"use client";

import React, { useState, useEffect, useMemo, ChangeEvent, Fragment } from "react";
import {
  Trash2, Pencil, Save, Check, X, Plus, Upload, FileText, Download, Eye,
  ChevronDown, Filter, RefreshCw, Printer, ShieldAlert, ShieldCheck, Lock, Unlock, Activity
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

// ==================== TYPES ====================
type CoreNetworkEntry = {
  _id: string;
  entities: string[];
  classification: string;
  remarks: string;
  attachments?: { filename: string; classification: string }[] | string[];
  submittedBy?: { name: string; department: string; division: string };
  createdAt: string;
  updatedAt: string;
};

type Notification = {
  message: string;
  type: "success" | "error";
};

const entityOptions = [
  "Person", "Asset", "Report", "Case", "Intel Project", "Family Details",
  "Tax Payer", "Tax Document", "Revenue", "Travel Log", "Missing Person",
  "Beneficial Owner", "Remittance", "Address", "Telco", "Transaction Documents",
  "Security Clearance", "Credit Information", "Custome_Document", "Watch List"
];

const classificationOptions = ["Confidential", "Secret", "Public"];

// SECURITY NOTE: In production, replace this with your actual auth context (e.g., NextAuth, JWT decode)
const getCurrentUser = () => ({
  name: "Sonam Wangchuk",
  department: "Anti-Corruption Commission",
  division: "Investigation Division",
});

// SECURITY: Basic file extension validation to prevent malicious uploads
const SAFE_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.txt'];
const isValidFile = (fileName: string) => {
  const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  return SAFE_EXTENSIONS.includes(ext);
};

export default function CoreNetworkPage() {
  // ----- State -----
  const [entries, setEntries] = useState<CoreNetworkEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<CoreNetworkEntry | null>(null);
  
  // Search & Filter States
  const [search, setSearch] = useState("");
  const [filterClassification, setFilterClassification] = useState("");
  const [filterEntity, setFilterEntity] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof CoreNetworkEntry | null; direction: "asc" | "desc" }>({ key: null, direction: "asc" });
  const [notification, setNotification] = useState<Notification | null>(null);

  // Inline expansion states
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Form states
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [classification, setClassification] = useState("");
  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState<{ file: File | null, classification: string }[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<{ filename: string; classification: string }[]>([]);

  // Print state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printEntry, setPrintEntry] = useState<CoreNetworkEntry | null>(null);

  // ================== FETCH DATA ==================
  const fetchEntries = async () => {
    try {
      const res = await fetch("/api/core-network");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setEntries(data);
    } catch (error) {
      showNotification((error as Error).message, "error");
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ================== FILE HANDLERS ==================
  const addNewAttachment = () => {
    setAttachments([...attachments, { file: null, classification: "Confidential" }]);
  };

  const handleFileInputChange = (idx: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!isValidFile(file.name)) {
        showNotification("Invalid file type. Allowed: PDF, DOC, XLS, Images, TXT", "error");
        return;
      }
      const updated = [...attachments];
      updated[idx].file = file;
      setAttachments(updated);
    }
    e.target.value = "";
  };

  const updateAttachmentClassification = (idx: number, val: string) => {
    const updated = [...attachments];
    updated[idx].classification = val;
    setAttachments(updated);
  };

  const removeAttachment = (idx: number) => {
    setAttachments(attachments.filter((_, i) => i !== idx));
  };

  const handleRemoveExistingFile = async (fileName: string) => {
    if (!editData) return;
    try {
      const res = await fetch("/api/core-network/delete-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: editData._id, fileName }),
      });
      if (!res.ok) throw new Error("Failed to delete file");
      setExistingAttachments(prev => prev.filter(f => f.filename !== fileName));
      showNotification("File deleted successfully");
      await fetchEntries();
    } catch (error) {
      showNotification((error as Error).message, "error");
    }
  };

  const handleViewFile = (fileName: string) => {
    // SECURITY: Ensure the file is served with correct headers in production to prevent XSS
    window.open(`/uploads/core-network/${fileName}`, "_blank", "noopener,noreferrer");
  };

  const handleDownloadFile = (fileName: string) => {
    const link = document.createElement("a");
    link.href = `/uploads/core-network/${fileName}`;
    link.download = fileName;
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ================== FORM HANDLERS ==================
  const resetForm = () => {
    setSelectedEntities([]);
    setClassification("");
    setRemarks("");
    setAttachments([]);
    setExistingAttachments([]);
    setEditData(null);
    setShowForm(false);
  };

  const handleEntitySelect = (e: ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
    setSelectedEntities(selected);
  };

  const removeEntity = (entity: string) => {
    setSelectedEntities(selectedEntities.filter((e) => e !== entity));
  };

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEntities.length === 0 || !classification) {
      showNotification("At least one Entity and Classification are required", "error");
      return;
    }

    const currentUser = getCurrentUser();
    const body = new FormData();
    body.append("entities", JSON.stringify(selectedEntities));
    body.append("classification", classification);
    body.append("remarks", remarks);
    body.append("submittedByName", currentUser.name);
    body.append("submittedByDepartment", currentUser.department);
    body.append("submittedByDivision", currentUser.division);

    const newFilesData = [];
    for (let i = 0; i < attachments.length; i++) {
      const att = attachments[i];
      if (att.file) {
        body.append(`attachment_${i}`, att.file);
        newFilesData.push({ classification: att.classification });
      }
    }
    body.append("newAttachments", JSON.stringify(newFilesData));

    if (editData) {
      body.append("_id", editData._id);
      body.append("existingAttachments", JSON.stringify(existingAttachments));
    }

    try {
      const url = "/api/core-network";
      const method = editData ? "PUT" : "POST";
      const res = await fetch(url, { method, body });
      if (!res.ok) throw new Error("Failed to save");
      await fetchEntries();
      resetForm();
      showNotification(editData ? "Entry updated successfully" : "Entry added successfully");
    } catch (error) {
      showNotification((error as Error).message, "error");
    }
  };

  const handleDelete = async (entry: CoreNetworkEntry) => {
    if (!confirm(`Are you sure you want to delete this entry?`)) return;
    try {
      const res = await fetch("/api/core-network", {
        method: "DELETE",
        body: JSON.stringify({ _id: entry._id }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchEntries();
      showNotification("Entry deleted successfully");
    } catch (error) {
      showNotification((error as Error).message, "error");
    }
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ================== PRINT HANDLERS (SECURE) ==================
  const handlePrintBlank = () => {
    setPrintEntry(null);
    setShowPrintModal(true);
  };

  const handlePrintEntry = (entry: CoreNetworkEntry) => {
    setPrintEntry(entry);
    setShowPrintModal(true);
  };

  const printForm = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const isBlank = !printEntry;
    const title = isBlank ? "Core Network Intelligence Sharing Form - Blank" : `Core Network Form - ${printEntry.entities?.join(", ")}`;
    
    // SECURITY: Safe HTML generation. We avoid document.write to prevent XSS if printEntry data contains scripts.
    const printDoc = printWindow.document;
    printDoc.open();
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: white; }
            @media print { body { margin: 0; padding: 0; } }
            .print-container { max-width: 210mm; margin: 0 auto; background: white; }
            .header { display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #333; }
            .logos { display: flex; gap: 10px; margin-bottom: 5px; }
            .section { margin-bottom: 20px; page-break-inside: avoid; }
            .section label { font-weight: bold; display: block; margin-bottom: 5px; font-size: 14px; }
            .checkbox-group { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 5px; }
            .checkbox-item { display: flex; align-items: center; gap: 8px; }
            .checkbox-box { width: 16px; height: 16px; border: 1px solid #333; background: white; }
            .radio-group { display: flex; gap: 20px; margin-top: 5px; }
            .radio-item { display: flex; align-items: center; gap: 8px; }
            .radio-circle { width: 16px; height: 16px; border: 1px solid #333; border-radius: 50%; background: white; }
            .blank-line { border-bottom: 1px solid #ccc; min-height: 30px; margin-top: 5px; }
            .remarks-box { border: 1px solid #ccc; min-height: 100px; border-radius: 4px; margin-top: 5px; padding: 5px; }
            .two-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .value { border-bottom: 1px solid #ccc; padding: 8px; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="header">
              <div>
                <div class="logos">
                  <img src="/form_logo.png" alt="Logo" style="height: 190px; width: auto; margin: -35px; display: block; margin-left: 0px;" />
                </div>
                <div><strong>Core Network</strong><br /><small>Intelligence & Information Sharing</small></div>
              </div>
              <div style="text-align: right;">
                <div>Form 02</div>
                <div style="font-size: 1.2rem; font-weight: bold;">Intelligence Sharing Form</div>
              </div>
            </div>
            <div class="section">
              <label>Entity (select one or more):</label>
              ${isBlank ? `
                <div class="checkbox-group">
                  ${entityOptions.map(opt => `<div class="checkbox-item"><div class="checkbox-box"></div><span>${opt}</span></div>`).join('')}
                </div>
              ` : `
                <div class="value">${printEntry.entities?.join(", ") || "—"}</div>
              `}
            </div>
            <div class="section">
              <label>Attachments:</label>
              ${isBlank ? '<div class="blank-line"></div><div class="blank-line"></div><div class="blank-line"></div>' : 
                (printEntry.attachments?.length ? printEntry.attachments.map((att: any) => `<div style="border-bottom:1px solid #ccc; padding:4px;">${typeof att === 'string' ? att : att.filename} – <strong>${typeof att === 'string' ? 'N/A' : att.classification}</strong></div>`).join('') : '<div class="blank-line"></div>')
              }
            </div>
            <div class="section">
              <label>Data Classification (select one):</label>
              ${isBlank ? `
                <div class="radio-group">
                  ${classificationOptions.map(opt => `<div class="radio-item"><div class="radio-circle"></div><span>${opt}</span></div>`).join('')}
                </div>
              ` : `
                <div class="value">${printEntry.classification || "—"}</div>
              `}
            </div>
            <div class="section">
              <label>Remarks:</label>
              <div class="${isBlank ? 'remarks-box' : 'value'}" style="min-height: 80px;">
                ${isBlank ? '' : (printEntry.remarks || "No remarks").replace(/\n/g, "<br/>")}
              </div>
            </div>
            <div class="section">
              <h4>Submission Information</h4>
              <div class="two-columns">
                <div><label>Name of Submitting Officer:</label><div class="${isBlank ? 'blank-line' : 'value'}">${isBlank ? '' : printEntry.submittedBy?.name || '—'}</div></div>
                <div><label>Department:</label><div class="${isBlank ? 'blank-line' : 'value'}">${isBlank ? '' : printEntry.submittedBy?.department || '—'}</div></div>
                <div><label>Division:</label><div class="${isBlank ? 'blank-line' : 'value'}">${isBlank ? '' : printEntry.submittedBy?.division || '—'}</div></div>
                <div><label>Date:</label><div class="${isBlank ? 'blank-line' : 'value'}">${isBlank ? '' : new Date(printEntry.createdAt).toLocaleDateString()}</div></div>
              </div>
              <div><label>Signature:</label><div class="${isBlank ? 'blank-line' : 'value'}" style="font-style: italic;">${isBlank ? '' : 'Electronically verified'}</div></div>
            </div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); };</script>
        </body>
      </html>
    `;
    
    printDoc.write(htmlContent);
    printDoc.close();
  };

  // ================== DASHBOARD COMPUTATIONS ==================
  // Use useMemo to prevent recalculating on every render
  const stats = useMemo(() => {
    const total = entries.length;
    const confidentialCount = entries.filter(e => e.classification === "Confidential").length;
    const secretCount = entries.filter(e => e.classification === "Secret").length;
    const publicCount = entries.filter(e => e.classification === "Public").length;
    
    const recentRecords = [...entries]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    // Calculate most frequent entity
    const entityCounts: Record<string, number> = {};
    entries.forEach(e => e.entities?.forEach(ent => {
      entityCounts[ent] = (entityCounts[ent] || 0) + 1;
    }));
    const topEntity = Object.keys(entityCounts).length > 0 
      ? Object.keys(entityCounts).reduce((a, b) => entityCounts[a] > entityCounts[b] ? a : b) 
      : "N/A";

    return { total, confidentialCount, secretCount, publicCount, recentRecords, topEntity };
  }, [entries]);

  // ================== FILTER & SORT LOGIC ==================
  const handleSort = (key: keyof CoreNetworkEntry) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleRowsChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setFilterClassification("");
    setFilterEntity("");
    setCurrentPage(1);
  };

  const { sortedEntries, totalPages, startIndex, paginatedEntries } = useMemo(() => {
    const filtered = entries.filter((entry) => {
      const matchesSearch = 
        (entry.remarks?.toLowerCase() || "").includes(search.toLowerCase()) ||
        (entry.classification?.toLowerCase() || "").includes(search.toLowerCase()) ||
        entry.entities?.some(e => e.toLowerCase().includes(search.toLowerCase()));
        
      const matchesClassification = filterClassification === "" || entry.classification === filterClassification;
      const matchesEntity = filterEntity === "" || entry.entities?.includes(filterEntity);

      return matchesSearch && matchesClassification && matchesEntity;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (!sortConfig.key) return 0;
      const key = sortConfig.key as keyof CoreNetworkEntry;
      const aVal = a[key];
      const bVal = b[key];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === "asc" ? aVal.localeCompare(bVal) : -aVal.localeCompare(bVal);
      }
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    const tPages = Math.ceil(sorted.length / rowsPerPage);
    const sIndex = (currentPage - 1) * rowsPerPage;
    const paginated = sorted.slice(sIndex, sIndex + rowsPerPage);

    return { sortedEntries: sorted, totalPages: tPages, startIndex: sIndex, paginatedEntries: paginated };
  }, [entries, search, filterClassification, filterEntity, sortConfig, currentPage, rowsPerPage]);

  const getSortIcon = (key: keyof CoreNetworkEntry) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  return (
    <>
      <div className="flex w-full min-h-screen bg-[#f4f7f9] text-black font-sans">
        
        {/* Fixed Sidebar */}
        <div className="fixed inset-y-0 left-0 z-20 bg-white shadow-xl">
          <Sidebar />
        </div>
        
        {/* Main Content Area */}
        <main className="flex-1 w-full transition-all duration-300 lg:ml-64 p-4 lg:p-8">
          <div className="max-w-[1600px] mx-auto w-full space-y-6">
            
            {/* ====== TOP BANNER ====== */}
            <div className="bg-[#2c5282] rounded-lg p-4 text-center text-white shadow-md">
              <h1 className="text-lg font-medium tracking-wide">
                Core Network Intelligence Overview | As of {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </h1>
            </div>

            {/* ====== KPI CARDS ====== */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total */}
              <div className="bg-[#e6f0fa] border-l-4 border-blue-600 rounded-lg p-5 shadow-sm">
                <div className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">Total Records</div>
                <div className="text-3xl font-bold text-blue-900">{stats.total}</div>
                <div className="text-xs text-blue-700 mt-1">Total Intelligence Entries</div>
              </div>
              {/* Card 2: Confidential */}
              <div className="bg-[#f3e8ff] border-l-4 border-purple-600 rounded-lg p-5 shadow-sm">
                <div className="text-xs font-bold text-purple-900 uppercase tracking-wider mb-1">Confidential</div>
                <div className="text-3xl font-bold text-purple-900">{stats.confidentialCount}</div>
                <div className="text-xs text-purple-700 mt-1">High Priority Security</div>
              </div>
              {/* Card 3: Secret */}
              <div className="bg-[#e6fffa] border-l-4 border-teal-500 rounded-lg p-5 shadow-sm">
                <div className="text-xs font-bold text-teal-900 uppercase tracking-wider mb-1">Secret</div>
                <div className="text-3xl font-bold text-teal-900">{stats.secretCount}</div>
                <div className="text-xs text-teal-700 mt-1">Medium Priority Security</div>
              </div>
              {/* Card 4: Public */}
              <div className="bg-[#fff5f5] border-l-4 border-red-500 rounded-lg p-5 shadow-sm">
                <div className="text-xs font-bold text-red-900 uppercase tracking-wider mb-1">Public</div>
                <div className="text-3xl font-bold text-red-900">{stats.publicCount}</div>
                <div className="text-xs text-red-700 mt-1">Low Priority / Public Info</div>
              </div>
            </div>

            {/* ====== MAIN GRID ====== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* LEFT COLUMN: Visual Distribution (CSS-based) */}
              <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                <h2 className="text-sm font-bold text-[#2c5282] uppercase tracking-wide mb-4 border-b pb-2">Security Classification Distribution</h2>
                <div className="space-y-4">
                  {[
                    { label: "Confidential", value: stats.confidentialCount, color: "bg-purple-500", total: stats.total },
                    { label: "Secret", value: stats.secretCount, color: "bg-teal-500", total: stats.total },
                    { label: "Public", value: stats.publicCount, color: "bg-red-500", total: stats.total },
                  ].map((item) => {
                    const percentage = stats.total === 0 ? 0 : Math.round((item.value / stats.total) * 100);
                    return (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                          <span>{item.label}</span>
                          <span>{item.value} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                          <div className={`${item.color} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Most Tagged Entity</h4>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-800 bg-gray-50 p-2 rounded">
                    <Activity size={16} className="text-blue-500" />
                    {stats.topEntity}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Recent Activity Table */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                <h2 className="text-sm font-bold text-[#2c5282] uppercase tracking-wide mb-4 border-b pb-2">Recent Activity (Last 5)</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-[#f8fafc]">
                      <tr>
                        <th className="px-3 py-2 text-left text-[11px] font-bold text-[#2c5282] uppercase tracking-wider">Entity</th>
                        <th className="px-3 py-2 text-left text-[11px] font-bold text-[#2c5282] uppercase tracking-wider">Classification</th>
                        <th className="px-3 py-2 text-left text-[11px] font-bold text-[#2c5282] uppercase tracking-wider">Submitted By</th>
                        <th className="px-3 py-2 text-left text-[11px] font-bold text-[#2c5282] uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stats.recentRecords.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-4 text-sm text-gray-500">No recent records.</td></tr>
                      ) : (
                        stats.recentRecords.map((rec) => (
                          <tr key={rec._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-3 text-sm font-medium text-gray-800 truncate max-w-[150px]">{rec.entities?.join(", ")}</td>
                            <td className="px-3 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                                rec.classification === "Confidential" ? "bg-purple-100 text-purple-800" :
                                rec.classification === "Secret" ? "bg-teal-100 text-teal-800" :
                                "bg-red-100 text-red-800"
                              }`}>
                                {rec.classification}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-sm text-gray-600">{rec.submittedBy?.name}</td>
                            <td className="px-3 py-3 text-sm text-gray-500">
                              {new Date(rec.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ====== BOTTOM SECTION: Takeaways ====== */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-[#2c5282] uppercase tracking-wide mb-3 flex items-center gap-2">
                <ShieldCheck size={16} /> Key Security Takeaways
              </h2>
              <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
                {stats.total === 0 ? (
                  <li>No data available to generate insights.</li>
                ) : (
                  <>
                    <li><strong>{stats.confidentialCount}</strong> records are marked as <strong>Confidential</strong>. Ensure appropriate access controls are in place.</li>
                    <li>The most frequently referenced entity across all submissions is <strong>"{stats.topEntity}"</strong>, appearing in multiple intelligence reports.</li>
                    <li>Out of {stats.total} total records, <strong>{Math.round(((stats.confidentialCount + stats.secretCount) / stats.total) * 100)}%</strong> require elevated security clearance to view.</li>
                  </>
                )}
              </ul>
            </div>

            {/* Notification */}
            {notification && (
              <div className={`px-4 py-3 rounded-lg shadow-md flex items-center gap-2 ${notification.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                {notification.type === "success" ? <Check size={18} /> : <ShieldAlert size={18} />}
                {notification.message}
              </div>
            )}

            {/* ====== TOOLBAR & DATA TABLE ====== */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              
              {/* Toolbar */}
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 p-4 border-b border-gray-200 bg-[#f8fafc]">
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                  {!showForm && (
                    <button
                      onClick={() => { resetForm(); setShowForm(true); }}
                      className="flex items-center gap-2 px-4 py-2 bg-[#2c5282] text-white border rounded-md text-xs font-bold hover:bg-[#1e3a8a] transition shadow-sm"
                    >
                      <Plus size={16} /> Add Entry
                    </button>
                  )}
                  <button
                    onClick={handlePrintBlank}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm"
                  >
                    <Printer size={16} /> Print Blank
                  </button>

                  <div className="relative">
                    <input
                      type="text"
                      value={search}
                      onChange={handleSearchChange}
                      placeholder="Search records..."
                      className="w-full sm:w-64 pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2c5282] focus:border-[#2c5282] outline-none transition"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600 font-medium ml-2">
                    <Filter size={16} className="text-gray-400" />
                    Filters:
                  </div>

                  <select
                    value={filterEntity}
                    onChange={(e) => { setFilterEntity(e.target.value); setCurrentPage(1); }}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm outline-none bg-white hover:border-gray-400 transition max-w-[160px]"
                  >
                    <option value="">All Entities</option>
                    {entityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>

                  <select
                    value={filterClassification}
                    onChange={(e) => { setFilterClassification(e.target.value); setCurrentPage(1); }}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm outline-none bg-white hover:border-gray-400 transition"
                  >
                    <option value="">All Classifications</option>
                    {classificationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>

                  {(search || filterClassification || filterEntity) && (
                    <button 
                      onClick={handleClearFilters}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-bold px-2 py-2"
                    >
                      <RefreshCw size={14} /> Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 text-sm whitespace-nowrap text-gray-600">
                  <span>Show</span>
                  <select value={rowsPerPage} onChange={handleRowsChange} className="border border-gray-300 rounded-md px-2 py-1 outline-none bg-white">
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value={40}>40</option>
                  </select>
                  <span className="font-bold text-[#2c5282]">{sortedEntries.length} records</span>
                </div>
              </div>

              {/* Main Data Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#f8fafc]">
                    <tr>
                      <th className="px-3 py-3 text-left text-[11px] font-bold text-[#2c5282] uppercase tracking-wider whitespace-nowrap">S/N</th>
                      <th onClick={() => handleSort("classification")} className="px-3 py-3 text-left text-[11px] font-bold text-[#2c5282] uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap">Classification {getSortIcon("classification")}</th>
                      <th className="px-3 py-3 text-left text-[11px] font-bold text-[#2c5282] uppercase tracking-wider whitespace-nowrap">Entities</th>
                      <th onClick={() => handleSort("remarks")} className="px-3 py-3 text-left text-[11px] font-bold text-[#2c5282] uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap">Remarks {getSortIcon("remarks")}</th>
                      <th className="px-3 py-3 text-left text-[11px] font-bold text-[#2c5282] uppercase tracking-wider whitespace-nowrap">Submitted By</th>
                      <th onClick={() => handleSort("createdAt")} className="px-3 py-3 text-left text-[11px] font-bold text-[#2c5282] uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap">Date {getSortIcon("createdAt")}</th>
                      <th className="px-3 py-3 text-left text-[11px] font-bold text-[#2c5282] uppercase tracking-wider whitespace-nowrap">Attachments</th>
                      <th className="px-3 py-3 text-left text-[11px] font-bold text-[#2c5282] uppercase tracking-wider whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {/* GLOBAL ADD FORM */}
                    {showForm && !editData && (
                      <tr className="bg-gray-50">
                        <td colSpan={8} className="p-4 border-b">
                          <form onSubmit={handleAddOrUpdate} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 relative overflow-hidden">
                            <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-[#2c5282] rounded-full"></div>

                            <div className="flex justify-between mb-4 items-center">
                              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Plus size={18} className="text-[#2c5282]"/> Create New Entry
                              </h2>
                              <button type="button" onClick={resetForm} className="text-gray-500 hover:text-gray-700 p-1"><X size={20} /></button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-bold text-gray-700">Entity (select one or more) *</label>
                                <select multiple value={selectedEntities} onChange={handleEntitySelect} className="w-full border border-gray-300 rounded px-3 py-2 mt-1 h-24 text-sm focus:ring-2 focus:ring-[#2c5282] outline-none">
                                  {entityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Hold Ctrl (Cmd on Mac) to select multiple</p>
                                {selectedEntities.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-3">
                                    {selectedEntities.map(entity => (
                                      <div key={entity} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                        {entity}
                                        <button type="button" onClick={() => removeEntity(entity)} className="ml-1 text-blue-600 hover:text-blue-800"><X size={12} /></button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div>
                                <label className="text-sm font-bold text-gray-700">Data Classification (overall) *</label>
                                <select value={classification} onChange={(e) => setClassification(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 mt-1 text-sm focus:ring-2 focus:ring-[#2c5282] outline-none" required>
                                  <option value="">Select Classification</option>
                                  {classificationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>

                                <label className="text-sm font-bold text-gray-700 mt-4 block">Remarks</label>
                                <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className="w-full border border-gray-300 rounded px-3 py-2 mt-1 text-sm focus:ring-2 focus:ring-[#2c5282] outline-none" />
                              </div>
                            </div>

                            <div className="mt-4">
                              <div className="flex justify-between items-center mb-2">
                                <label className="text-sm font-bold text-gray-700">Attachments (with classification)</label>
                                <button type="button" onClick={addNewAttachment} className="text-xs bg-gray-100 px-3 py-1.5 rounded font-bold hover:bg-gray-200 text-gray-700 transition">+ Add Attachment</button>
                              </div>
                              {existingAttachments.length > 0 && (
                                <div className="space-y-2 mb-3">
                                  {existingAttachments.map((att, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-100">
                                      <div className="flex items-center gap-2"><FileText size={14} className="text-blue-500" /><span className="text-sm font-medium">{att.filename}</span><span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">{att.classification}</span></div>
                                      <div className="flex gap-2"><button type="button" onClick={() => handleViewFile(att.filename)} className="text-blue-500 hover:text-blue-700"><Eye size={14} /></button><button type="button" onClick={() => handleRemoveExistingFile(att.filename)} className="text-red-500 hover:text-red-700"><X size={14} /></button></div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {attachments.map((att, idx) => (
                                <div key={idx} className="flex flex-wrap gap-2 items-center mt-2">
                                  <input type="file" onChange={(e) => handleFileInputChange(idx, e)} className="text-sm border border-gray-300 rounded p-1 flex-1" />
                                  <select value={att.classification} onChange={(e) => updateAttachmentClassification(idx, e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm outline-none">
                                    {classificationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                  </select>
                                  <button type="button" onClick={() => removeAttachment(idx)} className="text-red-500 hover:text-red-700"><X size={18} /></button>
                                </div>
                              ))}
                            </div>

                            <div className="flex justify-end gap-3 mt-5">
                              <button type="button" onClick={resetForm} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-bold text-gray-700 hover:bg-gray-50 transition"><X size={16} /> Cancel</button>
                              <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-[#2c5282] text-white rounded-md text-sm font-bold hover:bg-[#1e3a8a] transition shadow-sm"><Save size={16} /> Save Entry</button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    )}

                    {paginatedEntries.map((entry, index) => {
                      const isExpanded = expandedRows.has(entry._id);
                      const isEditing = showForm && editData?._id === entry._id;
                      const rowSNumber = startIndex + index + 1;

                      return (
                        <Fragment key={entry._id}>
                          {/* MAIN ROW */}
                          <tr 
                            className={`hover:bg-gray-50 transition-colors align-top cursor-pointer border-b border-gray-100 ${isEditing ? 'bg-blue-50' : ''}`}
                            onClick={(e) => {
                              if (isEditing) return; 
                              if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a') || (e.target as HTMLElement).closest('select') || (e.target as HTMLElement).closest('input')) return;
                              toggleRowExpand(entry._id);
                            }}
                          >
                            <td className="px-3 py-3 text-sm text-gray-500 font-medium">{rowSNumber}</td>
                            <td className="px-3 py-3 text-sm">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${
                                entry.classification === "Confidential" ? "bg-purple-100 text-purple-800" :
                                entry.classification === "Secret" ? "bg-teal-100 text-teal-800" :
                                "bg-red-100 text-red-800"
                              }`}>
                                {entry.classification}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-sm">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {entry.entities?.map((e, i) => (
                                  <span key={i} className="bg-gray-100 px-1.5 py-0.5 rounded text-xs border border-gray-200 text-gray-700">{e}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-sm">
                              <div className="flex items-center gap-1 max-w-[200px]">
                                <span className="text-gray-600 truncate">{entry.remarks || '-'}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-sm whitespace-nowrap font-medium text-gray-700">{entry.submittedBy?.name}</td>
                            <td className="px-3 py-3 text-sm whitespace-nowrap text-gray-500">{new Date(entry.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                            <td className="px-3 py-3 text-sm">
                              {entry.attachments && entry.attachments.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {entry.attachments.slice(0, 1).map((att: any, i: number) => {
                                    const fileName = typeof att === 'string' ? att : att.filename;
                                    return (
                                      <div key={i} className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                                        <FileText size={12} className="text-gray-400" />
                                        <span className="text-[11px] font-medium text-gray-600 truncate max-w-[60px]" title={fileName}>{fileName.length > 10 ? fileName.substring(0, 10) + '...' : fileName}</span>
                                        <button onClick={() => handleViewFile(fileName)} className="text-blue-500 hover:text-blue-700"><Eye size={12} /></button>
                                      </div>
                                    );
                                  })}
                                  {entry.attachments.length > 1 && <span className="text-xs text-gray-500 font-bold self-center">+{entry.attachments.length - 1}</span>}
                                </div>
                              ) : <span className="text-gray-400 text-xs">No files</span>}
                            </td>
                            <td className="px-3 py-3 text-sm">
                              <div className="flex flex-wrap gap-1">
                                <button onClick={() => toggleRowExpand(entry._id)} className={`flex items-center gap-1 border rounded px-2 py-1 text-xs font-medium transition ${isExpanded ? "bg-blue-50 text-blue-600 border-blue-300" : "border-gray-200 hover:bg-gray-100 text-gray-600"}`}>
                                  {isExpanded ? <ChevronDown size={12} className="rotate-180" /> : <ChevronDown size={12} />}
                                  {isExpanded ? "Hide" : "View"}
                                </button>
                                <button onClick={() => {
                                  setEditData(entry);
                                  setSelectedEntities(entry.entities || []);
                                  setClassification(entry.classification);
                                  setRemarks(entry.remarks || "");
                                  setExistingAttachments(entry.attachments as any || []);
                                  setAttachments([]);
                                  setShowForm(true);
                                }} className={`flex items-center gap-1 border rounded px-2 py-1 text-xs font-medium transition ${isEditing ? 'bg-blue-100 border-blue-400 text-blue-800' : 'border-gray-200 hover:bg-gray-100 text-gray-600'}`}>
                                  <Pencil size={12} /> Edit
                                </button>
                                <button onClick={() => handlePrintEntry(entry)} className="flex items-center gap-1 border border-gray-200 rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition">
                                  <Printer size={12} /> Print
                                </button>
                                <button onClick={() => handleDelete(entry)} className="flex items-center gap-1 border border-red-100 rounded px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 transition">
                                  <Trash2 size={12} /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* INLINE EDIT FORM */}
                          {isEditing && (
                            <tr>
                              <td colSpan={8} className="p-4 bg-gray-50 border-b border-gray-200">
                                <form onSubmit={handleAddOrUpdate} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 relative overflow-hidden">
                                  <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-[#2c5282] rounded-full"></div>

                                  <div className="flex justify-between mb-4 items-center">
                                    <h2 className="text-lg font-bold text-[#2c5282] flex items-center gap-2">
                                      <Pencil size={18} /> Edit Entry: <span className="font-mono bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-100">{entry.entities?.join(", ")}</span>
                                    </h2>
                                    <button type="button" onClick={resetForm} className="text-gray-500 hover:text-gray-700 p-1"><X size={20} /></button>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-bold text-gray-700">Entity (select one or more) *</label>
                                      <select multiple value={selectedEntities} onChange={handleEntitySelect} className="w-full border border-gray-300 rounded px-3 py-2 mt-1 h-24 text-sm focus:ring-2 focus:ring-[#2c5282] outline-none">
                                        {entityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                      </select>
                                      <p className="text-xs text-gray-500 mt-1">Hold Ctrl (Cmd on Mac) to select multiple</p>
                                      {selectedEntities.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-3">
                                          {selectedEntities.map(entity => (
                                            <div key={entity} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                              {entity}
                                              <button type="button" onClick={() => removeEntity(entity)} className="ml-1 text-blue-600 hover:text-blue-800"><X size={12} /></button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <label className="text-sm font-bold text-gray-700">Data Classification (overall) *</label>
                                      <select value={classification} onChange={(e) => setClassification(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 mt-1 text-sm focus:ring-2 focus:ring-[#2c5282] outline-none" required>
                                        <option value="">Select Classification</option>
                                        {classificationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                      </select>

                                      <label className="text-sm font-bold text-gray-700 mt-4 block">Remarks</label>
                                      <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className="w-full border border-gray-300 rounded px-3 py-2 mt-1 text-sm focus:ring-2 focus:ring-[#2c5282] outline-none" />
                                    </div>
                                  </div>

                                  <div className="mt-4">
                                    <div className="flex justify-between items-center mb-2">
                                      <label className="text-sm font-bold text-gray-700">Attachments (with classification)</label>
                                      <button type="button" onClick={addNewAttachment} className="text-xs bg-gray-100 px-3 py-1.5 rounded font-bold hover:bg-gray-200 text-gray-700 transition">+ Add Attachment</button>
                                    </div>
                                    {existingAttachments.length > 0 && (
                                      <div className="space-y-2 mb-3">
                                        {existingAttachments.map((att, idx) => (
                                          <div key={idx} className="flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-100">
                                            <div className="flex items-center gap-2"><FileText size={14} className="text-blue-500" /><span className="text-sm font-medium">{att.filename}</span><span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">{att.classification}</span></div>
                                            <div className="flex gap-2"><button type="button" onClick={() => handleViewFile(att.filename)} className="text-blue-500 hover:text-blue-700"><Eye size={14} /></button><button type="button" onClick={() => handleRemoveExistingFile(att.filename)} className="text-red-500 hover:text-red-700"><X size={14} /></button></div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {attachments.map((att, idx) => (
                                      <div key={idx} className="flex flex-wrap gap-2 items-center mt-2">
                                        <input type="file" onChange={(e) => handleFileInputChange(idx, e)} className="text-sm border border-gray-300 rounded p-1 flex-1" />
                                        <select value={att.classification} onChange={(e) => updateAttachmentClassification(idx, e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm outline-none">
                                          {classificationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                        <button type="button" onClick={() => removeAttachment(idx)} className="text-red-500 hover:text-red-700"><X size={18} /></button>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="flex justify-end gap-3 mt-5">
                                    <button type="button" onClick={resetForm} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-bold text-gray-700 hover:bg-gray-50 transition"><X size={16} /> Cancel</button>
                                    <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-[#2c5282] text-white rounded-md text-sm font-bold hover:bg-[#1e3a8a] transition shadow-sm"><Check size={16} /> Save Changes</button>
                                  </div>
                                </form>
                              </td>
                            </tr>
                          )}

                          {/* INLINE VIEW DETAILS */}
                          {isExpanded && !isEditing && (
                            <tr>
                              <td colSpan={8} className="px-6 py-6 bg-[#f8fafc] border-b border-gray-200 shadow-inner">
                                <div className="space-y-6 max-w-5xl mx-auto">
                                  <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                      <label className="text-xs font-bold text-[#2c5282] uppercase tracking-wider block mb-2">Entities</label>
                                      <div className="flex flex-wrap gap-2 mt-1">
                                        {entry.entities?.map((e, i) => <span key={i} className="bg-white border border-gray-300 px-2.5 py-1 rounded-md text-sm font-medium text-gray-700 shadow-sm">{e}</span>)}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs font-bold text-[#2c5282] uppercase tracking-wider block mb-2">Data Classification</label>
                                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-1 ${
                                        entry.classification === "Confidential" ? "bg-purple-100 text-purple-800 border border-purple-200" :
                                        entry.classification === "Secret" ? "bg-teal-100 text-teal-800 border border-teal-200" :
                                        "bg-red-100 text-red-800 border border-red-200"
                                      }`}>
                                        {entry.classification}
                                      </span>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="text-xs font-bold text-[#2c5282] uppercase tracking-wider block mb-2">Remarks</label>
                                    <p className="text-sm text-gray-800 bg-white p-4 rounded-lg border border-gray-200 shadow-sm leading-relaxed">{entry.remarks || "No remarks provided."}</p>
                                  </div>

                                  {/* Attachments */}
                                  {entry.attachments && entry.attachments.length > 0 && (
                                    <div>
                                      <h4 className="text-xs font-bold text-[#2c5282] uppercase tracking-wider mb-2">Attachments</h4>
                                      <div className="flex flex-wrap gap-3">
                                        {entry.attachments.map((att: any, i: number) => {
                                          const fileName = typeof att === 'string' ? att : att.filename;
                                          const classType = typeof att === 'string' ? 'N/A' : att.classification;
                                          return (
                                            <div key={i} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm hover:border-blue-300 transition">
                                              <FileText size={16} className="text-blue-500" />
                                              <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{fileName}</span>
                                              {classType !== 'N/A' && (
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                  classType === "Confidential" ? "bg-purple-100 text-purple-700" :
                                                  classType === "Secret" ? "bg-teal-100 text-teal-700" :
                                                  "bg-red-100 text-red-700"
                                                }`}>{classType}</span>
                                              )}
                                              <div className="flex items-center gap-1 border-l border-gray-200 pl-2 ml-1">
                                                <button onClick={() => handleViewFile(fileName)} className="text-blue-500 hover:text-blue-700 p-1" title="View"><Eye size={16} /></button>
                                                <button onClick={() => handleDownloadFile(fileName)} className="text-green-500 hover:text-green-700 p-1" title="Download"><Download size={16} /></button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Submission Info */}
                                  <div className="pt-4 border-t border-gray-200">
                                    <h4 className="text-xs font-bold text-[#2c5282] uppercase tracking-wider mb-3">Submission Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                      <div><label className="text-xs font-bold text-gray-500">Name of Submitting Officer</label><div className="text-sm font-medium text-gray-800 mt-1">{entry.submittedBy?.name || "—"}</div></div>
                                      <div><label className="text-xs font-bold text-gray-500">Department</label><div className="text-sm text-gray-800 mt-1">{entry.submittedBy?.department || "—"}</div></div>
                                      <div><label className="text-xs font-bold text-gray-500">Division</label><div className="text-sm text-gray-800 mt-1">{entry.submittedBy?.division || "—"}</div></div>
                                      <div><label className="text-xs font-bold text-gray-500">Date</label><div className="text-sm text-gray-800 mt-1">{new Date(entry.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div></div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                    {paginatedEntries.length === 0 && (
                      <tr><td colSpan={8} className="text-center py-8 text-gray-500 font-medium">No records found matching your criteria.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION FOOTER */}
              {totalPages > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-4 py-3 bg-[#f8fafc] border-t border-gray-200 text-sm text-gray-600 rounded-b-lg">
                  <div>
                    Showing <span className="font-bold text-gray-800">{startIndex + 1}</span> to <span className="font-bold text-gray-800">{Math.min(startIndex + rowsPerPage, sortedEntries.length)}</span> of <span className="font-bold text-gray-800">{sortedEntries.length}</span> records
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      disabled={currentPage === 1} 
                      onClick={() => setCurrentPage(p => p-1)} 
                      className="px-3 py-1 bg-white border border-gray-300 rounded font-semibold text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                    >
                      Prev
                    </button>
                    <span className="font-medium text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button 
                      disabled={currentPage === totalPages} 
                      onClick={() => setCurrentPage(p => p+1)} 
                      className="px-3 py-1 bg-white border border-gray-300 rounded font-semibold text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Print Modal / Preview */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center border border-gray-200">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Print Document</h3>
            <p className="text-gray-600 mb-6 text-sm">
              {printEntry ? "Are you ready to print this entry?" : "Generate a blank form for manual filling?"}
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowPrintModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-bold text-gray-700 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={printForm} className="px-4 py-2 bg-[#2c5282] text-white rounded-md text-sm font-bold hover:bg-[#1e3a8a] flex items-center gap-2 shadow-sm transition"><Printer size={16} /> Print Now</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}