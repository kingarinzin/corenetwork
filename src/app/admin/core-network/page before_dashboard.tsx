"use client";

import React, { useState, useEffect, ChangeEvent, Fragment } from "react";
import {
  Trash2, Pencil, Save, Check, X, Plus, Upload, FileText, Download, Eye,
  ChevronDown, Filter, RefreshCw, Printer
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

const getCurrentUser = () => ({
  name: "Sonam Wangchuk",
  department: "Anti-Corruption Commission",
  division: "Investigation Division",
});

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
    window.open(`/uploads/core-network/${fileName}`, "_blank");
  };

  const handleDownloadFile = (fileName: string) => {
    const link = document.createElement("a");
    link.href = `/uploads/core-network/${fileName}`;
    link.download = fileName;
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

  // ================== PRINT HANDLERS ==================
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
    
    const attachmentsHtml = !isBlank && printEntry.attachments?.length 
      ? printEntry.attachments.map((att: any) => 
          `<div style="border-bottom:1px solid #ccc; padding:4px;">${typeof att === 'string' ? att : att.filename} – <strong>${typeof att === 'string' ? 'N/A' : att.classification}</strong></div>`
        ).join('')
      : '<div style="border-bottom:1px solid #ccc; height:30px;"></div>';

    printWindow.document.write(`
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
              ${isBlank ? '<div class="blank-line"></div><div class="blank-line"></div><div class="blank-line"></div>' : attachmentsHtml}
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
    `);
    printWindow.document.close();
  };

  // ================== DASHBOARD COMPUTATIONS ==================
  const total = entries.length;
  const confidentialCount = entries.filter(e => e.classification === "Confidential").length;
  const secretCount = entries.filter(e => e.classification === "Secret").length;
  const publicCount = entries.filter(e => e.classification === "Public").length;
  
  const recentRecords = [...entries]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

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

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = 
      (entry.remarks?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (entry.classification?.toLowerCase() || "").includes(search.toLowerCase()) ||
      entry.entities?.some(e => e.toLowerCase().includes(search.toLowerCase()));
      
    const matchesClassification = filterClassification === "" || entry.classification === filterClassification;
    const matchesEntity = filterEntity === "" || entry.entities?.includes(filterEntity);

    return matchesSearch && matchesClassification && matchesEntity;
  });

  const sortedEntries = [...filteredEntries].sort((a, b) => {
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

  const totalPages = Math.ceil(sortedEntries.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedEntries = sortedEntries.slice(startIndex, startIndex + rowsPerPage);

  const getSortIcon = (key: keyof CoreNetworkEntry) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  return (
    <>
      <div className="flex w-full min-h-screen bg-gray-100 text-black">
        
        {/* Fixed Sidebar */}
        <div className="fixed inset-y-0 left-0 z-20 bg-white shadow-xl">
          <Sidebar />
        </div>
        
        {/* Main Content Area */}
        <main className="flex-1 w-full transition-all duration-300 lg:ml-64 p-4 lg:p-6">
          <div className="max-w-[1600px] mx-auto w-full">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Core Network Intelligence Sharing</h1>
            </div>

            {/* ====== DASHBOARD ====== */}
            <div className="mb-6">
              <div className="bg-white rounded-xl shadow-sm px-4 py-3 mb-4 flex flex-wrap items-center justify-around gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-gray-600">Total:</span>
                  <span className="font-bold text-gray-800">{total}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span className="text-gray-600">Confidential:</span>
                  <span className="font-bold text-gray-800">{confidentialCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  <span className="text-gray-600">Secret:</span>
                  <span className="font-bold text-gray-800">{secretCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-gray-600">Public:</span>
                  <span className="font-bold text-gray-800">{publicCount}</span>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-4 mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Activity</h3>
                {recentRecords.length === 0 ? (
                  <p className="text-gray-500 text-sm">No recent records.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Entity</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Classification</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Submitted By</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {recentRecords.map((rec) => (
                          <tr key={rec._id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm truncate max-w-[150px]">{rec.entities?.join(", ")}</td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                rec.classification === "Confidential" ? "bg-red-100 text-red-800" :
                                rec.classification === "Secret" ? "bg-orange-100 text-orange-800" :
                                "bg-green-100 text-green-800"
                              }`}>
                                {rec.classification}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm">{rec.submittedBy?.name}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {new Date(rec.createdAt).toLocaleDateString('en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric'
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Notification */}
            {notification && (
              <div className={`mb-4 px-4 py-2 rounded ${notification.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {notification.message}
              </div>
            )}

            {/* Toolbar with Filters */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
              
              <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                {/* Add Button */}
                {!showForm && (
                  <button
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white border rounded-md text-xs font-medium hover:bg-blue-700 transition"
                  >
                    <Plus size={14} />
                    Add Entry
                  </button>
                )}

                {/* Print Blank */}
                <button
                  onClick={handlePrintBlank}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md text-xs font-medium hover:border-black transition"
                >
                  <Printer size={14} />
                  Print Blank Form
                </button>

                {/* Search */}
                <input
                  type="text"
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Search (Entity, Classification, Remarks)..."
                  className="w-full sm:w-64 px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-400 outline-none"
                />

                <div className="flex items-center gap-2 text-sm text-gray-600 font-medium ml-2">
                  <Filter size={16} className="text-gray-400" />
                  Filters:
                </div>

                {/* Entity Filter */}
                <select
                  value={filterEntity}
                  onChange={(e) => { setFilterEntity(e.target.value); setCurrentPage(1); }}
                  className="border rounded px-2 py-1.5 text-sm outline-none bg-gray-50 hover:bg-white transition max-w-[150px]"
                >
                  <option value="">All Entities</option>
                  {entityOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>

                {/* Classification Filter */}
                <select
                  value={filterClassification}
                  onChange={(e) => { setFilterClassification(e.target.value); setCurrentPage(1); }}
                  className="border rounded px-2 py-1.5 text-sm outline-none bg-gray-50 hover:bg-white transition"
                >
                  <option value="">All Classifications</option>
                  {classificationOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>

                {/* Clear Filters Button */}
                {(search || filterClassification || filterEntity) && (
                  <button 
                    onClick={handleClearFilters}
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1.5"
                    title="Clear all filters"
                  >
                    <RefreshCw size={14} /> Clear
                  </button>
                )}
              </div>

              {/* Records Counter */}
              <div className="flex items-center gap-2 text-sm whitespace-nowrap text-gray-600">
                <span>Show</span>
                <select value={rowsPerPage} onChange={handleRowsChange} className="border rounded px-2 py-1 outline-none">
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={40}>40</option>
                </select>
                <span className="font-medium text-gray-800">{filteredEntries.length} records</span>
              </div>
            </div>

            {/* Table Container */}
            <div className="bg-white shadow rounded-lg overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap">S/N</th>
                    <th onClick={() => handleSort("classification")} className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap">Classification {getSortIcon("classification")}</th>
                    <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap">Entities</th>
                    <th onClick={() => handleSort("remarks")} className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap">Remarks {getSortIcon("remarks")}</th>
                    <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap">Submitted By</th>
                    <th onClick={() => handleSort("createdAt")} className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap">Date {getSortIcon("createdAt")}</th>
                    <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap">Attachments</th>
                    <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {/* GLOBAL ADD FORM */}
                  {showForm && !editData && (
                    <tr className="bg-gray-50">
                      <td colSpan={8} className="p-4 border-b">
                        <form onSubmit={handleAddOrUpdate} className="bg-white rounded-lg shadow-sm p-6 pl-8 relative overflow-hidden">
                          <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-orange-400 rounded-full"></div>

                          <div className="flex justify-between mb-4 items-center">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                              <Plus size={18} className="text-blue-600"/> Create New Entry
                            </h2>
                            <button type="button" onClick={resetForm} className="text-gray-500 hover:text-gray-700 p-1"><X size={20} /></button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">Entity (select one or more) *</label>
                              <select multiple value={selectedEntities} onChange={handleEntitySelect} className="w-full border rounded px-3 py-2 mt-1 h-24">
                                {entityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                              <p className="text-xs text-gray-500 mt-1">Hold Ctrl (Cmd on Mac) to select multiple</p>
                              {selectedEntities.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {selectedEntities.map(entity => (
                                    <div key={entity} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                      {entity}
                                      <button type="button" onClick={() => removeEntity(entity)} className="ml-1 text-blue-600 hover:text-blue-800"><X size={12} /></button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div>
                              <label className="text-sm font-medium">Data Classification (overall) *</label>
                              <select value={classification} onChange={(e) => setClassification(e.target.value)} className="w-full border rounded px-3 py-2 mt-1" required>
                                <option value="">Select Classification</option>
                                {classificationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>

                              <label className="text-sm font-medium mt-4 block">Remarks</label>
                              <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className="w-full border rounded px-3 py-2 mt-1" />
                            </div>
                          </div>

                          <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-sm font-medium">Attachments (with classification)</label>
                              <button type="button" onClick={addNewAttachment} className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">+ Add Attachment</button>
                            </div>
                            {existingAttachments.length > 0 && (
                              <div className="space-y-2 mb-3">
                                {existingAttachments.map((att, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-100">
                                    <div className="flex items-center gap-2"><FileText size={14} className="text-blue-500" /><span className="text-sm">{att.filename}</span><span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{att.classification}</span></div>
                                    <div className="flex gap-2"><button type="button" onClick={() => handleViewFile(att.filename)} className="text-blue-500"><Eye size={14} /></button><button type="button" onClick={() => handleRemoveExistingFile(att.filename)} className="text-red-500"><X size={14} /></button></div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {attachments.map((att, idx) => (
                              <div key={idx} className="flex flex-wrap gap-2 items-center mt-2">
                                <input type="file" onChange={(e) => handleFileInputChange(idx, e)} className="text-sm border rounded p-1 flex-1" />
                                <select value={att.classification} onChange={(e) => updateAttachmentClassification(idx, e.target.value)} className="border rounded px-2 py-1 text-sm">
                                  {classificationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                                <button type="button" onClick={() => removeAttachment(idx)} className="text-red-500"><X size={18} /></button>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-end gap-3 mt-5">
                            <button type="button" onClick={resetForm} className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium hover:bg-gray-50 transition"><X size={16} /> Cancel</button>
                            <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition shadow-sm"><Save size={16} /> Save Entry</button>
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
                          className={`hover:bg-gray-50 transition-colors align-top cursor-pointer ${isEditing ? 'bg-blue-50' : ''}`}
                          onClick={(e) => {
                            if (isEditing) return; 
                            if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a') || (e.target as HTMLElement).closest('select') || (e.target as HTMLElement).closest('input')) return;
                            toggleRowExpand(entry._id);
                          }}
                        >
                          <td className="px-2 py-3 text-sm text-gray-500">{rowSNumber}</td>
                          <td className="px-2 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${
                              entry.classification === "Confidential" ? "bg-red-100 text-red-800" :
                              entry.classification === "Secret" ? "bg-orange-100 text-orange-800" :
                              "bg-green-100 text-green-800"
                            }`}>
                              {entry.classification}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-sm">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {entry.entities?.map((e, i) => (
                                <span key={i} className="bg-gray-100 px-1.5 py-0.5 rounded text-xs border border-gray-200">{e}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-2 py-3 text-sm">
                            <div className="flex items-center gap-1 max-w-[200px]">
                              <span className="text-gray-600 truncate">{entry.remarks || '-'}</span>
                            </div>
                          </td>
                          <td className="px-2 py-3 text-sm whitespace-nowrap">{entry.submittedBy?.name}</td>
                          <td className="px-2 py-3 text-sm whitespace-nowrap">{new Date(entry.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td className="px-2 py-3 text-sm">
                            {entry.attachments && entry.attachments.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {entry.attachments.slice(0, 1).map((att: any, i: number) => {
                                  const fileName = typeof att === 'string' ? att : att.filename;
                                  return (
                                    <div key={i} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                                      <FileText size={12} className="text-gray-500" />
                                      <span className="text-xs truncate max-w-[60px]" title={fileName}>{fileName.length > 10 ? fileName.substring(0, 10) + '...' : fileName}</span>
                                      <button onClick={() => handleViewFile(fileName)} className="text-blue-500 hover:text-blue-700"><Eye size={12} /></button>
                                    </div>
                                  );
                                })}
                                {entry.attachments.length > 1 && <span className="text-xs text-gray-500 font-medium">+{entry.attachments.length - 1}</span>}
                              </div>
                            ) : <span className="text-gray-400 text-xs">No files</span>}
                          </td>
                          <td className="px-2 py-3 text-sm">
                            <div className="flex flex-wrap gap-1">
                              <button onClick={() => toggleRowExpand(entry._id)} className={`flex items-center gap-1 border rounded px-1.5 py-1 text-xs hover:border-black transition ${isExpanded ? "bg-blue-50 text-blue-600 border-blue-300" : ""}`}>
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
                              }} className={`flex items-center gap-1 border rounded px-1.5 py-1 text-xs hover:border-black ${isEditing ? 'bg-blue-100 border-blue-400 text-blue-800' : ''}`}>
                                <Pencil size={12} /> Edit
                              </button>
                              <button onClick={() => handlePrintEntry(entry)} className="flex items-center gap-1 border rounded px-1.5 py-1 text-xs hover:border-black text-gray-700">
                                <Printer size={12} /> Print
                              </button>
                              <button onClick={() => handleDelete(entry)} className="flex items-center gap-1 border rounded px-1.5 py-1 text-xs hover:border-black text-red-500">
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* INLINE EDIT FORM */}
                        {isEditing && (
                          <tr>
                            <td colSpan={8} className="p-4 bg-gray-50 border-b border-gray-200">
                              <form onSubmit={handleAddOrUpdate} className="bg-white rounded-lg shadow-sm p-6 pl-8 relative overflow-hidden">
                                <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-orange-400 rounded-full"></div>

                                <div className="flex justify-between mb-4 items-center">
                                  <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                                    <Pencil size={18} /> Edit Entry: <span className="font-mono bg-blue-100 px-2 py-0.5 rounded">{entry.entities?.join(", ")}</span>
                                  </h2>
                                  <button type="button" onClick={resetForm} className="text-gray-500 hover:text-gray-700 p-1"><X size={20} /></button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium text-gray-700">Entity (select one or more) *</label>
                                    <select multiple value={selectedEntities} onChange={handleEntitySelect} className="w-full border rounded px-3 py-2 mt-1 h-24">
                                      {entityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">Hold Ctrl (Cmd on Mac) to select multiple</p>
                                    {selectedEntities.length > 0 && (
                                      <div className="flex flex-wrap gap-2 mt-3">
                                        {selectedEntities.map(entity => (
                                          <div key={entity} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                            {entity}
                                            <button type="button" onClick={() => removeEntity(entity)} className="ml-1 text-blue-600 hover:text-blue-800"><X size={12} /></button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-700">Data Classification (overall) *</label>
                                    <select value={classification} onChange={(e) => setClassification(e.target.value)} className="w-full border rounded px-3 py-2 mt-1" required>
                                      <option value="">Select Classification</option>
                                      {classificationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>

                                    <label className="text-sm font-medium mt-4 block text-gray-700">Remarks</label>
                                    <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className="w-full border rounded px-3 py-2 mt-1" />
                                  </div>
                                </div>

                                <div className="mt-4">
                                  <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-medium text-gray-700">Attachments (with classification)</label>
                                    <button type="button" onClick={addNewAttachment} className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">+ Add Attachment</button>
                                  </div>
                                  {existingAttachments.length > 0 && (
                                    <div className="space-y-2 mb-3">
                                      {existingAttachments.map((att, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-100">
                                          <div className="flex items-center gap-2"><FileText size={14} className="text-blue-500" /><span className="text-sm">{att.filename}</span><span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{att.classification}</span></div>
                                          <div className="flex gap-2"><button type="button" onClick={() => handleViewFile(att.filename)} className="text-blue-500"><Eye size={14} /></button><button type="button" onClick={() => handleRemoveExistingFile(att.filename)} className="text-red-500"><X size={14} /></button></div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {attachments.map((att, idx) => (
                                    <div key={idx} className="flex flex-wrap gap-2 items-center mt-2">
                                      <input type="file" onChange={(e) => handleFileInputChange(idx, e)} className="text-sm border rounded p-1 flex-1" />
                                      <select value={att.classification} onChange={(e) => updateAttachmentClassification(idx, e.target.value)} className="border rounded px-2 py-1 text-sm">
                                        {classificationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                      </select>
                                      <button type="button" onClick={() => removeAttachment(idx)} className="text-red-500"><X size={18} /></button>
                                    </div>
                                  ))}
                                </div>

                                <div className="flex justify-end gap-3 mt-5">
                                  <button type="button" onClick={resetForm} className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium hover:bg-gray-50 transition"><X size={16} /> Cancel</button>
                                  <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition shadow-sm"><Check size={16} /> Save Changes</button>
                                </div>
                              </form>
                            </td>
                          </tr>
                        )}

                        {/* INLINE VIEW DETAILS */}
                        {isExpanded && !isEditing && (
                          <tr>
                            <td colSpan={8} className="px-4 py-6 bg-gray-50 border-b-2 border-gray-200 shadow-inner">
                              <div className="space-y-6 max-w-5xl mx-auto">
                                <div className="grid md:grid-cols-2 gap-6">
                                  <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Entities</label>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {entry.entities?.map((e, i) => <span key={i} className="bg-gray-200 px-2 py-0.5 rounded text-sm text-gray-700">{e}</span>)}
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Data Classification</label>
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${
                                      entry.classification === "Confidential" ? "bg-red-100 text-red-800" :
                                      entry.classification === "Secret" ? "bg-orange-100 text-orange-800" :
                                      "bg-green-100 text-green-800"
                                    }`}>
                                      {entry.classification}
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Remarks</label>
                                  <p className="text-sm text-gray-800 bg-white p-3 rounded border border-gray-200">{entry.remarks || "No remarks provided."}</p>
                                </div>

                                {/* Attachments */}
                                {entry.attachments && entry.attachments.length > 0 && (
                                  <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Attachments</h4>
                                    <div className="flex flex-wrap gap-3">
                                      {entry.attachments.map((att: any, i: number) => {
                                        const fileName = typeof att === 'string' ? att : att.filename;
                                        const classType = typeof att === 'string' ? 'N/A' : att.classification;
                                        return (
                                          <div key={i} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                                            <FileText size={16} className="text-blue-500" />
                                            <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{fileName}</span>
                                            {classType !== 'N/A' && (
                                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                classType === "Confidential" ? "bg-red-100 text-red-700" :
                                                classType === "Secret" ? "bg-orange-100 text-orange-700" :
                                                "bg-green-100 text-green-700"
                                              }`}>{classType}</span>
                                            )}
                                            <div className="flex items-center gap-1 border-l pl-2 ml-1">
                                              <button onClick={() => handleViewFile(fileName)} className="text-blue-500 hover:text-blue-700 p-1"><Eye size={16} /></button>
                                              <button onClick={() => handleDownloadFile(fileName)} className="text-green-500 hover:text-green-700 p-1"><Download size={16} /></button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Submission Info */}
                                <div className="pt-4 border-t border-gray-200">
                                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Submission Information</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                    <div><label className="text-xs text-gray-500">Name of Submitting Officer</label><div className="text-sm font-medium text-gray-800 mt-1">{entry.submittedBy?.name || "—"}</div></div>
                                    <div><label className="text-xs text-gray-500">Department</label><div className="text-sm text-gray-800 mt-1">{entry.submittedBy?.department || "—"}</div></div>
                                    <div><label className="text-xs text-gray-500">Division</label><div className="text-sm text-gray-800 mt-1">{entry.submittedBy?.division || "—"}</div></div>
                                    <div><label className="text-xs text-gray-500">Date</label><div className="text-sm text-gray-800 mt-1">{new Date(entry.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div></div>
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
                    <tr><td colSpan={8} className="text-center py-6 text-gray-500">No records found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-5 text-sm text-gray-600">
                <div>
                  Showing <span className="font-semibold text-gray-800">{startIndex + 1}</span> to <span className="font-semibold text-gray-800">{Math.min(startIndex + rowsPerPage, sortedEntries.length)}</span> of <span className="font-semibold text-gray-800">{sortedEntries.length}</span> records
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(p => p-1)} 
                    className="font-semibold text-lg disabled:text-gray-300 hover:text-blue-600 transition-colors"
                  >
                    &lt;
                  </button>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button 
                    disabled={currentPage === totalPages} 
                    onClick={() => setCurrentPage(p => p+1)} 
                    className="font-semibold text-lg disabled:text-gray-300 hover:text-blue-600 transition-colors"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Print Modal / Preview */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center">
            <h3 className="text-xl font-semibold mb-4">Print Document</h3>
            <p className="text-gray-600 mb-6">
              {printEntry ? "Are you ready to print this entry?" : "Generate a blank form for manual filling?"}
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowPrintModal(false)} className="px-4 py-2 border rounded-md hover:bg-gray-50">Cancel</button>
              <button onClick={printForm} className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 flex items-center gap-2"><Printer size={16} /> Print Now</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}