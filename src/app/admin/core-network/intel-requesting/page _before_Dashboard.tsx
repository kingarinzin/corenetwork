"use client";

import React, { useState, useEffect, ChangeEvent, Fragment } from "react";
import {
  Trash2, Pencil, Save, Check, X, Plus, Upload, FileText, Download, Eye,
  Maximize2, Printer, Filter, RefreshCw, ChevronDown
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

// ==================== TYPES ====================
type IntelRequest = {
  _id: string;
  entities: string[];
  purpose: string;
  urgency: string;
  remarks: string;
  requestingOfficer: {
    name: string;
    department: string;
    division: string;
  };
  requestingDate: string;
  attachments?: { filename: string; classification: string }[] | string[];
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

const urgencyOptions = ["Low", "Medium", "High", "Critical"];
const classificationOptions = ["Confidential", "Secret", "Public"];

export default function IntelRequestPage() {
  // ----- State -----
  const [requests, setRequests] = useState<IntelRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<IntelRequest | null>(null);
  
  // Search & Filter States
  const [search, setSearch] = useState("");
  const [filterUrgency, setFilterUrgency] = useState("");
  const [filterEntity, setFilterEntity] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof IntelRequest | null; direction: "asc" | "desc" }>({ key: null, direction: "asc" });
  const [notification, setNotification] = useState<Notification | null>(null);

  // Inline expansion states
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Form states
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [purpose, setPurpose] = useState("");
  const [urgency, setUrgency] = useState("");
  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState<{ file: File | null, classification: string }[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<{ filename: string; classification: string }[]>([]);
  const [requestingOfficer, setRequestingOfficer] = useState("");
  const [requestingDepartment, setRequestingDepartment] = useState("");
  const [requestingDivision, setRequestingDivision] = useState("");
  const [requestingDate, setRequestingDate] = useState("");

  // Print state
  const [showBlankPreview, setShowBlankPreview] = useState(false);

  // ================== FETCH DATA ==================
  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/core-network/intel-requesting");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setRequests(data);
    } catch (error) {
      showNotification((error as Error).message, "error");
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ================== FILE HANDLERS ==================
  const addNewAttachment = () => {
    setAttachments([...attachments, { file: null, classification: "Confidential" }]);
  };

  const updateAttachmentFile = (idx: number, file: File) => {
    const updated = [...attachments];
    updated[idx].file = file;
    setAttachments(updated);
  };

  const updateAttachmentClassification = (idx: number, classification: string) => {
    const updated = [...attachments];
    updated[idx].classification = classification;
    setAttachments(updated);
  };

  const removeAttachment = (idx: number) => {
    setAttachments(attachments.filter((_, i) => i !== idx));
  };

  const handleRemoveExistingFile = async (filename: string) => {
    if (!editData) return;
    try {
      const res = await fetch("/api/core-network/intel-requesting/delete-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: editData._id, fileName: filename }),
      });
      if (!res.ok) throw new Error("Failed to delete file");
      setExistingAttachments((prev) => prev.filter((f) => f.filename !== filename));
      showNotification("File deleted successfully");
      await fetchRequests();
    } catch (error) {
      showNotification((error as Error).message, "error");
    }
  };

  const handleViewFile = (filename: string) => {
    window.open(`/uploads/core-network/${filename}`, "_blank");
  };

  const handleDownloadFile = (filename: string) => {
    const link = document.createElement("a");
    link.href = `/uploads/core-network/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ================== FORM HANDLERS ==================
  const resetForm = () => {
    setEditData(null);
    setSelectedEntities([]);
    setPurpose("");
    setUrgency("");
    setRemarks("");
    setAttachments([]);
    setExistingAttachments([]);
    setRequestingOfficer("");
    setRequestingDepartment("");
    setRequestingDivision("");
    setRequestingDate("");
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
    if (selectedEntities.length === 0 || !urgency || !purpose) {
      showNotification("Entity, Purpose, and Urgency are required", "error");
      return;
    }

    const body = new FormData();
    body.append("entities", JSON.stringify(selectedEntities));
    body.append("purpose", purpose);
    body.append("urgency", urgency);
    body.append("remarks", remarks);
    body.append("requestingOfficer", requestingOfficer);
    body.append("requestingDepartment", requestingDepartment);
    body.append("requestingDivision", requestingDivision);
    body.append("requestingDate", requestingDate);

    const newAttachmentsMeta = [];
    for (let i = 0; i < attachments.length; i++) {
      const att = attachments[i];
      if (att.file) {
        body.append(`attachment_${i}`, att.file);
        newAttachmentsMeta.push({ classification: att.classification });
      }
    }
    body.append("newAttachments", JSON.stringify(newAttachmentsMeta));

    if (editData) {
      body.append("_id", editData._id);
      body.append("existingAttachments", JSON.stringify(existingAttachments));
    }

    try {
      const url = "/api/core-network/intel-requesting";
      const method = editData ? "PUT" : "POST";
      const res = await fetch(url, { method, body });
      if (!res.ok) throw new Error("Operation failed");
      await fetchRequests();
      resetForm();
      showNotification(editData ? "Request updated successfully" : "Request created successfully");
    } catch (error) {
      showNotification((error as Error).message, "error");
    }
  };

  const handleEditClick = (req: IntelRequest) => {
    setEditData(req);
    setSelectedEntities(req.entities || []);
    setPurpose(req.purpose || "");
    setUrgency(req.urgency || "");
    setRemarks(req.remarks || "");
    setExistingAttachments(req.attachments as any || []);
    setAttachments([]);
    setRequestingOfficer(req.requestingOfficer?.name || "");
    setRequestingDepartment(req.requestingOfficer?.department || "");
    setRequestingDivision(req.requestingOfficer?.division || "");
    setRequestingDate(req.requestingDate ? req.requestingDate.split("T")[0] : "");
    setShowForm(true);
  };

  const handleDelete = async (req: IntelRequest) => {
    if (!confirm(`Delete request for "${req.entities.join(", ")}"?`)) return;
    try {
      const res = await fetch("/api/core-network/intel-requesting", {
        method: "DELETE",
        body: JSON.stringify({ _id: req._id }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchRequests();
      showNotification("Request deleted successfully");
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
    setShowBlankPreview(true);
  };

  const printBlankForm = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>CoRE NETWORK - Intelligence Request</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: white; }
            @media print { body { margin: 0; padding: 0; } }
            .print-container { max-width: 210mm; margin: 0 auto; background: white; }
            .header { display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #333; }
            .logos { display: flex; gap: 10px; margin-bottom: 5px; }
            .section { margin-bottom: 20px; page-break-inside: avoid; }
            .section label { font-weight: bold; display: block; margin-bottom: 5px; font-size: 14px; }
            .checkbox-group { display: grid; grid-template-columns: repeat(2,1fr); gap: 8px; margin-top: 5px; }
            .checkbox-item { display: flex; align-items: center; gap: 8px; }
            .checkbox-box { width: 16px; height: 16px; border: 1px solid #333; background: white; }
            .radio-group { display: flex; gap: 20px; margin-top: 5px; }
            .radio-item { display: flex; align-items: center; gap: 8px; }
            .radio-circle { width: 16px; height: 16px; border: 1px solid #333; border-radius: 50%; background: white; }
            .blank-line { border-bottom: 1px solid #ccc; min-height: 30px; margin-top: 5px; }
            .remarks-box { border: 1px solid #ccc; min-height: 100px; border-radius: 4px; margin-top: 5px; }
            .two-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="header">
              <div>
                <div class="logos">
                  <img src="/form_logo.png" alt="Logo" style="height: 100px; width: auto;" />
                </div>
                <div><strong>Core Network</strong><br /><small>Request</small></div>
              </div>
              <div style="text-align: right;"><div>Form 01</div><div style="font-size:1.2rem;font-weight:bold;">Request Form</div></div>
            </div>
            <div class="section"><label>Entity:</label><div class="checkbox-group">${entityOptions.map(opt => `<div class="checkbox-item"><div class="checkbox-box"></div><span>${opt}</span></div>`).join('')}</div></div>
            <div class="section"><label>Purpose:</label><div class="blank-line"></div></div>
            <div class="section"><label>Urgency:</label><div class="radio-group">${urgencyOptions.map(opt => `<div class="radio-item"><div class="radio-circle"></div><span>${opt}</span></div>`).join('')}</div></div>
            <div class="section"><label>Remarks:</label><div class="remarks-box"></div></div>
            <div class="section"><label>Attachments:</label><div class="blank-line"></div><div class="blank-line"></div></div>
            <div class="section"><h4>Requesting Agency</h4><div class="two-columns">
              <div><label>Name of Requesting Officer:</label><div class="blank-line"></div></div>
              <div><label>Department:</label><div class="blank-line"></div></div>
              <div><label>Division:</label><div class="blank-line"></div></div>
              <div><label>Requesting Date:</label><div class="blank-line"></div></div>
            </div><div><label>Signature:</label><div class="blank-line"></div></div></div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintModal = (req: IntelRequest) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const attachmentsHtml = (req.attachments || []).map((att: any) => `<div>${typeof att === 'string' ? att : att.filename} (${typeof att === 'string' ? 'N/A' : att.classification})</div>`).join('');
    printWindow.document.write(`
      <html>
        <head>
          <title>Intel Request Form - ${req.purpose || "Request"}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: white; }
            @media print { body { margin: 0; padding: 0; } }
            .print-container { max-width: 210mm; margin: 0 auto; background: white; }
            .header { display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #333; }
            .logos { display: flex; gap: 10px; margin-bottom: 5px; }
            .section { margin-bottom: 20px; page-break-inside: avoid; }
            .section label { font-weight: bold; display: block; margin-bottom: 5px; font-size: 14px; }
            .section .value { border-bottom: 1px solid #ccc; padding: 8px; margin-bottom: 10px; }
            .two-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="header">
              <div>
                <div class="logos">
                  <img src="/form_logo.png" alt="Logo" style="height: 100px; width: auto;" />
                </div>
                <div><strong>Core Network</strong><br /><small>Request</small></div>
              </div>
              <div style="text-align: right;"><div>Form 01</div><div style="font-size:1.2rem;font-weight:bold;">Request Form</div></div>
            </div>
            <div class="section"><label>Entity/Entities:</label><div class="value">${req.entities?.join(", ") || "—"}</div></div>
            <div class="section"><label>Purpose:</label><div class="value">${req.purpose || "—"}</div></div>
            <div class="section"><label>Urgency:</label><div class="value">${req.urgency || "—"}</div></div>
            <div class="section"><label>Remarks:</label><div class="value" style="min-height:80px;">${(req.remarks || "—").replace(/\n/g, "<br/>")}</div></div>
            <div class="section"><label>Attachments:</label><div class="value">${attachmentsHtml || "None"}</div></div>
            <div class="section"><h4>Requesting Agency</h4><div class="two-columns">
              <div><label>Name:</label><div class="value">${req.requestingOfficer?.name || "—"}</div></div>
              <div><label>Department:</label><div class="value">${req.requestingOfficer?.department || "—"}</div></div>
              <div><label>Division:</label><div class="value">${req.requestingOfficer?.division || "—"}</div></div>
              <div><label>Date:</label><div class="value">${req.requestingDate ? new Date(req.requestingDate).toLocaleDateString() : "—"}</div></div>
            </div><div><label>Signature:</label><div class="value" style="font-style:italic;">Electronically submitted</div></div></div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ================== DASHBOARD COMPUTATIONS ==================
  const total = requests.length;
  const lowCount = requests.filter(r => r.urgency === "Low").length;
  const mediumCount = requests.filter(r => r.urgency === "Medium").length;
  const highCount = requests.filter(r => r.urgency === "High").length;
  const criticalCount = requests.filter(r => r.urgency === "Critical").length;

  const recentRecords = [...requests]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // ================== FILTER & SORT LOGIC ==================
  const handleSort = (key: keyof IntelRequest) => {
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
    setFilterUrgency("");
    setFilterEntity("");
    setCurrentPage(1);
  };

  const filteredRequests = requests.filter((req) => {
    const matchesSearch = 
      req.purpose?.toLowerCase().includes(search.toLowerCase()) ||
      req.remarks?.toLowerCase().includes(search.toLowerCase()) ||
      req.entities?.some(e => e.toLowerCase().includes(search.toLowerCase()));
      
    const matchesUrgency = filterUrgency === "" || req.urgency === filterUrgency;
    const matchesEntity = filterEntity === "" || req.entities?.includes(filterEntity);

    return matchesSearch && matchesUrgency && matchesEntity;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const key = sortConfig.key as keyof IntelRequest;
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

  const totalPages = Math.ceil(sortedRequests.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedRequests = sortedRequests.slice(startIndex, startIndex + rowsPerPage);

  const getSortIcon = (key: keyof IntelRequest) => {
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
              <h1 className="text-2xl font-bold text-gray-900">Intel Requests (Form 01)</h1>
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
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-gray-600">Low:</span>
                  <span className="font-bold text-gray-800">{lowCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                  <span className="text-gray-600">Medium:</span>
                  <span className="font-bold text-gray-800">{mediumCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  <span className="text-gray-600">High:</span>
                  <span className="font-bold text-gray-800">{highCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span className="text-gray-600">Critical:</span>
                  <span className="font-bold text-gray-800">{criticalCount}</span>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-4 mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Requests</h3>
                {recentRecords.length === 0 ? (
                  <p className="text-gray-500 text-sm">No recent records.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Entity</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Purpose</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Urgency</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {recentRecords.map((rec) => (
                          <tr key={rec._id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm truncate max-w-[150px]">{rec.entities?.join(", ")}</td>
                            <td className="px-4 py-2 text-sm truncate max-w-[150px]">{rec.purpose}</td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                rec.urgency === "Critical" ? "bg-red-100 text-red-800" :
                                rec.urgency === "High" ? "bg-orange-100 text-orange-800" :
                                rec.urgency === "Medium" ? "bg-yellow-100 text-yellow-800" :
                                "bg-green-100 text-green-800"
                              }`}>
                                {rec.urgency}
                              </span>
                            </td>
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
                    New Request
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
                  placeholder="Search (Entity, Purpose)..."
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

                {/* Urgency Filter */}
                <select
                  value={filterUrgency}
                  onChange={(e) => { setFilterUrgency(e.target.value); setCurrentPage(1); }}
                  className="border rounded px-2 py-1.5 text-sm outline-none bg-gray-50 hover:bg-white transition"
                >
                  <option value="">All Urgencies</option>
                  {urgencyOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>

                {/* Clear Filters Button */}
                {(search || filterUrgency || filterEntity) && (
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
                <span className="font-medium text-gray-800">{filteredRequests.length} records</span>
              </div>
            </div>

            {/* Table Container */}
            <div className="bg-white shadow rounded-lg overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap">S/N</th>
                    <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap">Entity</th>
                    <th onClick={() => handleSort("purpose")} className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap">Purpose {getSortIcon("purpose")}</th>
                    <th onClick={() => handleSort("urgency")} className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap">Urgency {getSortIcon("urgency")}</th>
                    <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap">Attachments</th>
                    <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap">Requesting Officer</th>
                    <th onClick={() => handleSort("requestingDate")} className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap">Date {getSortIcon("requestingDate")}</th>
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
                              <Plus size={18} className="text-blue-600"/> Create New Request
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
                              <label className="text-sm font-medium">Purpose *</label>
                              <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} className="w-full border rounded px-3 py-2 mt-1" required />

                              <div className="flex gap-4 mt-4">
                                <div className="flex-1">
                                  <label className="text-sm font-medium">Urgency *</label>
                                  <select value={urgency} onChange={(e) => setUrgency(e.target.value)} className="w-full border rounded px-3 py-2 mt-1" required>
                                    <option value="">Select urgency</option>
                                    {urgencyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                  </select>
                                </div>
                                <div className="flex-1">
                                  <label className="text-sm font-medium">Date</label>
                                  <input type="date" value={requestingDate} onChange={(e) => setRequestingDate(e.target.value)} className="w-full border rounded px-3 py-2 mt-1" />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">Remarks</label>
                              <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className="w-full border rounded px-3 py-2 mt-1" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                               <div>
                                  <label className="text-sm font-medium">Req. Officer</label>
                                  <input type="text" value={requestingOfficer} onChange={(e) => setRequestingOfficer(e.target.value)} className="w-full border rounded px-3 py-2 mt-1" required />
                               </div>
                               <div>
                                  <label className="text-sm font-medium">Department</label>
                                  <input type="text" value={requestingDepartment} onChange={(e) => setRequestingDepartment(e.target.value)} className="w-full border rounded px-3 py-2 mt-1" />
                               </div>
                               <div className="col-span-2">
                                  <label className="text-sm font-medium">Division</label>
                                  <input type="text" value={requestingDivision} onChange={(e) => setRequestingDivision(e.target.value)} className="w-full border rounded px-3 py-2 mt-1" />
                               </div>
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
                                <input type="file" onChange={(e) => updateAttachmentFile(idx, e.target.files![0])} className="text-sm border rounded p-1 flex-1" />
                                <select value={att.classification} onChange={(e) => updateAttachmentClassification(idx, e.target.value)} className="border rounded px-2 py-1 text-sm">
                                  {classificationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                                <button type="button" onClick={() => removeAttachment(idx)} className="text-red-500"><X size={18} /></button>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-end gap-3 mt-5">
                            <button type="button" onClick={resetForm} className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium hover:bg-gray-50 transition"><X size={16} /> Cancel</button>
                            <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition shadow-sm"><Save size={16} /> Save Request</button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )}

                  {paginatedRequests.map((req, index) => {
                    const isExpanded = expandedRows.has(req._id);
                    const isEditing = showForm && editData?._id === req._id;
                    const rowSNumber = startIndex + index + 1;

                    return (
                      <Fragment key={req._id}>
                        {/* MAIN ROW */}
                        <tr 
                          className={`hover:bg-gray-50 transition-colors align-top cursor-pointer ${isEditing ? 'bg-blue-50' : ''}`}
                          onClick={(e) => {
                            if (isEditing) return; 
                            if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a') || (e.target as HTMLElement).closest('select') || (e.target as HTMLElement).closest('input')) return;
                            toggleRowExpand(req._id);
                          }}
                        >
                          <td className="px-2 py-3 text-sm text-gray-500">{rowSNumber}</td>
                          <td className="px-2 py-3 text-sm">
                            <div className="flex flex-wrap gap-1 max-w-[150px]">
                              {req.entities?.map((e, i) => (
                                <span key={i} className="bg-gray-100 px-1.5 py-0.5 rounded text-xs border border-gray-200">{e}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-2 py-3 text-sm">
                            <div className="flex items-center gap-1 max-w-[200px]">
                              <span className="text-gray-600 truncate">{req.purpose || '-'}</span>
                            </div>
                          </td>
                          <td className="px-2 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${
                              req.urgency === "Critical" ? "bg-red-100 text-red-800" :
                              req.urgency === "High" ? "bg-orange-100 text-orange-800" :
                              req.urgency === "Medium" ? "bg-yellow-100 text-yellow-800" :
                              "bg-green-100 text-green-800"
                            }`}>
                              {req.urgency}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-sm">
                            {req.attachments && req.attachments.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {req.attachments.slice(0, 1).map((att: any, i: number) => {
                                  const fileName = typeof att === 'string' ? att : att.filename;
                                  return (
                                    <div key={i} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                                      <FileText size={12} className="text-gray-500" />
                                      <span className="text-xs truncate max-w-[60px]" title={fileName}>{fileName.length > 10 ? fileName.substring(0, 10) + '...' : fileName}</span>
                                      <button onClick={() => handleViewFile(fileName)} className="text-blue-500 hover:text-blue-700"><Eye size={12} /></button>
                                    </div>
                                  );
                                })}
                                {req.attachments.length > 1 && <span className="text-xs text-gray-500 font-medium">+{req.attachments.length - 1}</span>}
                              </div>
                            ) : <span className="text-gray-400 text-xs">No files</span>}
                          </td>
                          <td className="px-2 py-3 text-sm whitespace-nowrap">{req.requestingOfficer?.name || "—"}</td>
                          <td className="px-2 py-3 text-sm whitespace-nowrap">{req.requestingDate ? new Date(req.requestingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "—"}</td>
                          <td className="px-2 py-3 text-sm">
                            <div className="flex flex-wrap gap-1">
                              <button
                                onClick={() => toggleRowExpand(req._id)}
                                className={`flex items-center gap-1 border rounded px-1.5 py-1 text-xs hover:border-black transition ${isExpanded ? "bg-blue-50 text-blue-600 border-blue-300" : ""}`}
                              >
                                {isExpanded ? <ChevronDown size={12} className="rotate-180" /> : <ChevronDown size={12} />}
                                {isExpanded ? "Hide" : "View"}
                              </button>

                              <button onClick={() => handleEditClick(req)} className={`flex items-center gap-1 border rounded px-1.5 py-1 text-xs hover:border-black ${isEditing ? 'bg-blue-100 border-blue-400 text-blue-800' : ''}`}>
                                <Pencil size={12} /> Edit
                              </button>

                              <button onClick={() => handleDelete(req)} className="flex items-center gap-1 border rounded px-1.5 py-1 text-xs hover:border-black text-red-500">
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
                                    <Pencil size={18} /> Edit Request: <span className="font-mono bg-blue-100 px-2 py-0.5 rounded">{req.entities?.join(", ")}</span>
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
                                    <label className="text-sm font-medium text-gray-700">Purpose *</label>
                                    <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} className="w-full border rounded px-3 py-2 mt-1" required />

                                    <div className="flex gap-4 mt-4">
                                      <div className="flex-1">
                                        <label className="text-sm font-medium text-gray-700">Urgency *</label>
                                        <select value={urgency} onChange={(e) => setUrgency(e.target.value)} className="w-full border rounded px-3 py-2 mt-1" required>
                                          <option value="">Select urgency</option>
                                          {urgencyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                      </div>
                                      <div className="flex-1">
                                        <label className="text-sm font-medium text-gray-700">Date</label>
                                        <input type="date" value={requestingDate} onChange={(e) => setRequestingDate(e.target.value)} className="w-full border rounded px-3 py-2 mt-1" />
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium text-gray-700">Remarks</label>
                                    <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className="w-full border rounded px-3 py-2 mt-1" />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                     <div>
                                        <label className="text-sm font-medium text-gray-700">Req. Officer</label>
                                        <input type="text" value={requestingOfficer} onChange={(e) => setRequestingOfficer(e.target.value)} className="w-full border rounded px-3 py-2 mt-1" required />
                                     </div>
                                     <div>
                                        <label className="text-sm font-medium text-gray-700">Department</label>
                                        <input type="text" value={requestingDepartment} onChange={(e) => setRequestingDepartment(e.target.value)} className="w-full border rounded px-3 py-2 mt-1" />
                                     </div>
                                     <div className="col-span-2">
                                        <label className="text-sm font-medium text-gray-700">Division</label>
                                        <input type="text" value={requestingDivision} onChange={(e) => setRequestingDivision(e.target.value)} className="w-full border rounded px-3 py-2 mt-1" />
                                     </div>
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
                                      <input type="file" onChange={(e) => updateAttachmentFile(idx, e.target.files![0])} className="text-sm border rounded p-1 flex-1" />
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
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Entity / Entities</label>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {req.entities?.map((e, i) => <span key={i} className="bg-gray-200 px-2 py-0.5 rounded text-sm text-gray-700">{e}</span>)}
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Urgency</label>
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${
                                      req.urgency === "Critical" ? "bg-red-100 text-red-800" :
                                      req.urgency === "High" ? "bg-orange-100 text-orange-800" :
                                      req.urgency === "Medium" ? "bg-yellow-100 text-yellow-800" :
                                      "bg-green-100 text-green-800"
                                    }`}>
                                      {req.urgency}
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Purpose</label>
                                  <p className="text-sm text-gray-800 bg-white p-3 rounded border border-gray-200">{req.purpose || "No purpose provided."}</p>
                                </div>
                                
                                <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Remarks</label>
                                  <p className="text-sm text-gray-800 bg-white p-3 rounded border border-gray-200">{req.remarks || "No remarks provided."}</p>
                                </div>

                                {/* Attachments */}
                                {req.attachments && req.attachments.length > 0 && (
                                  <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Attachments</h4>
                                    <div className="flex flex-wrap gap-3">
                                      {req.attachments.map((att: any, i: number) => {
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
                                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Requesting Agency</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                    <div><label className="text-xs text-gray-500">Requesting Officer</label><div className="text-sm font-medium text-gray-800 mt-1">{req.requestingOfficer?.name || "—"}</div></div>
                                    <div><label className="text-xs text-gray-500">Department</label><div className="text-sm text-gray-800 mt-1">{req.requestingOfficer?.department || "—"}</div></div>
                                    <div><label className="text-xs text-gray-500">Division</label><div className="text-sm text-gray-800 mt-1">{req.requestingOfficer?.division || "—"}</div></div>
                                    <div><label className="text-xs text-gray-500">Requesting Date</label><div className="text-sm text-gray-800 mt-1">{req.requestingDate ? new Date(req.requestingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "—"}</div></div>
                                  </div>
                                </div>
                                
                                <div className="flex justify-end mt-4">
                                  <button onClick={() => handlePrintModal(req)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-100 transition shadow-sm">
                                    <Printer size={16} /> Print Form (A4)
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  {paginatedRequests.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-6 text-gray-500">No requests found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-5 text-sm text-gray-600">
                <div>
                  Showing <span className="font-semibold text-gray-800">{startIndex + 1}</span> to <span className="font-semibold text-gray-800">{Math.min(startIndex + rowsPerPage, sortedRequests.length)}</span> of <span className="font-semibold text-gray-800">{sortedRequests.length}</span> records
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

      {/* Blank Preview Modal */}
      {showBlankPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md" onClick={() => setShowBlankPreview(false)} style={{ animation: "fadeIn 0.2s ease-out" }}>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl" style={{ height: "90vh", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
            <div className="border-b bg-gray-50 pt-0 pb-2 px-4 md:px-6 flex-shrink-0">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex flex-col items-start">
                  <img src="/form_logo.png" alt="Logo" style={{ height: "180px", width: "auto", margin: "-35px", display: "block", marginLeft: "-10px" }}/>
                  <div>
                    <div className="text-lg font-bold">CoRE Network</div>
                    <div className="text-xs text-gray-500">Request</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-600">Form 01</div>
                  <div className="text-xl font-bold text-gray-800">Request Form (Blank)</div>
                </div>
              </div>
            </div>
            <div className="p-4 md:p-6 space-y-6 overflow-y-auto" style={{ flex: 1, minHeight: 0 }}>
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-xs font-semibold uppercase">Entity</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {entityOptions.map((e) => (
                    <div key={e} className="flex items-center gap-2">
                      <div className="w-4 h-4 border border-gray-400 rounded-sm"></div>
                      <span>{e}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-xs font-semibold uppercase">Purpose</label>
                <div className="border-b border-gray-400 min-h-[40px] mt-1"></div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-xs font-semibold uppercase">Urgency</label>
                <div className="flex gap-4 mt-2">
                  {urgencyOptions.map((opt) => (
                    <div key={opt} className="flex items-center gap-2">
                      <div className="w-4 h-4 border border-gray-400 rounded-full"></div>
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-xs font-semibold uppercase">Remarks</label>
                <div className="border border-gray-300 min-h-[100px] rounded-md mt-1"></div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-xs font-semibold uppercase">Attachments</label>
                <div className="border-b border-gray-400 min-h-[40px] mt-1"></div>
                <div className="border-b border-gray-400 min-h-[40px] mt-2"></div>
              </div>
              <div className="border-t pt-6 mt-4">
                <h4 className="text-sm font-semibold mb-4">Requesting Agency</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Requesting Officer</label>
                    <div className="mt-1 p-2 border-b border-gray-400"></div>
                  </div>
                  <div>
                    <label>Department</label>
                    <div className="mt-1 p-2 border-b"></div>
                  </div>
                  <div>
                    <label>Division</label>
                    <div className="mt-1 p-2 border-b"></div>
                  </div>
                  <div>
                    <label>Requesting Date</label>
                    <div className="mt-1 p-2 border-b"></div>
                  </div>
                </div>
                <div className="mt-6">
                  <label>Signature</label>
                  <div className="mt-1 p-2 border-b"></div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 flex-shrink-0">
              <button onClick={printBlankForm} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm hover:border-gray-600 transition">
                <div className="w-6 h-6 rounded-full border border-gray-400 flex items-center justify-center">
                  <Printer size={14} className="text-gray-600" />
                </div>
                Print Form (A4)
              </button>
              <button onClick={() => setShowBlankPreview(false)} className="px-4 py-2 border rounded-md text-sm hover:border-black transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @media print { body * { visibility: hidden; } #print-blank-area, #print-blank-area * { visibility: visible; } #print-blank-area { position: absolute; top: 0; left: 0; width: 100%; margin: 0; padding: 0; } }
      `}</style>
    </>
  );
}