"use client";

import { useState, useEffect } from "react";
import {
  Trash2,
  Pencil,
  Plus,
  X,
  Check,
  Upload,
  FileText,
  Eye,
  Download,
  Maximize2,
  Printer,
  Shield,
  Building2,
  Users,
  Landmark,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

const entityOptions = [
  "Person",
  "Asset",
  "Report",
  "Case",
  "Intel Project",
  "Family Details",
  "Tax Payer",
  "Tax Document",
  "Revenue",
  "Travel Log",
  "Missing Person",
  "Beneficial Owner",
  "Remittance",
  "Address",
  "Telco",
  "Transaction Documents",
  "Security Clearance",
  "Credit Information",
  "Custome_Document",
  "Watch List"
];

const urgencyOptions = ["Low", "Medium", "High", "Critical"];
const classificationOptions = ["Confidential", "Secret", "Public"];

export default function IntelRequestPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);
  const [selectedView, setSelectedView] = useState<any>(null);
  const [showBlankPreview, setShowBlankPreview] = useState(false);

  // Form state
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [purpose, setPurpose] = useState("");
  const [urgency, setUrgency] = useState("");
  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState<any[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);
  const [requestingOfficer, setRequestingOfficer] = useState("");
  const [requestingDepartment, setRequestingDepartment] = useState("");
  const [requestingDivision, setRequestingDivision] = useState("");
  const [requestingDate, setRequestingDate] = useState("");

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/core-network/intel-requesting");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRequests(data);
    } catch (error) {
      showNotification("Failed to load requests", "error");
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const showNotification = (msg: string, type: string = "success") => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Entity chips
  const handleEntitySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
    setSelectedEntities(selected);
  };
  
  const removeEntity = (entity: string) => {
    setSelectedEntities(selectedEntities.filter((e) => e !== entity));
  };

  // Attachments with per-file classification
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

  // Existing files
  const handleRemoveExistingFile = async (filename: string) => {
    if (!editData) return;
    try {
      const res = await fetch("/api/core-network/intel-requesting/delete-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: editData._id, fileName: filename }),
      });
      if (!res.ok) throw new Error();
      setExistingAttachments((prev) => prev.filter((f) => f.filename !== filename));
      showNotification("File deleted");
      await fetchRequests();
    } catch (error: any) {
      showNotification(error.message, "error");
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
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedEntities.length === 0 || !urgency || !purpose) {
      showNotification("Entity, Purpose, and Urgency are required", "error");
      return;
    }

    const formData = new FormData();
    formData.append("entities", JSON.stringify(selectedEntities));
    formData.append("purpose", purpose);
    formData.append("urgency", urgency);
    formData.append("remarks", remarks);
    formData.append("requestingOfficer", requestingOfficer);
    formData.append("requestingDepartment", requestingDepartment);
    formData.append("requestingDivision", requestingDivision);
    formData.append("requestingDate", requestingDate);

    // New attachments (with classification)
    const newAttachmentsMeta = [];
    for (let i = 0; i < attachments.length; i++) {
      const att = attachments[i];
      if (att.file) {
        formData.append(`attachment_${i}`, att.file);
        newAttachmentsMeta.push({ classification: att.classification });
      }
    }
    formData.append("newAttachments", JSON.stringify(newAttachmentsMeta));

    if (editData) {
      formData.append("_id", editData._id);
      formData.append("existingAttachments", JSON.stringify(existingAttachments));
    }

    try {
      const url = "/api/core-network/intel-requesting";
      const method = editData ? "PUT" : "POST";
      const res = await fetch(url, { method, body: formData });
      if (!res.ok) throw new Error();
      await fetchRequests();
      setShowForm(false);
      resetForm();
      showNotification(editData ? "Request updated" : "Request created", "success");
    } catch (error) {
      showNotification("Operation failed", "error");
    }
  };

  const handleEdit = (req: any) => {
    setEditData(req);
    setSelectedEntities(req.entities || []);
    setPurpose(req.purpose || "");
    setUrgency(req.urgency || "");
    setRemarks(req.remarks || "");
    setExistingAttachments(req.attachments || []);
    setAttachments([]);
    setRequestingOfficer(req.requestingOfficer?.name || "");
    setRequestingDepartment(req.requestingOfficer?.department || "");
    setRequestingDivision(req.requestingOfficer?.division || "");
    setRequestingDate(req.requestingDate ? req.requestingDate.split("T")[0] : "");
    setShowForm(true);
  };

  const handleDelete = async (req: any) => {
    if (!confirm(`Delete request for "${req.entities.join(", ")}"?`)) return;
    try {
      const res = await fetch("/api/core-network/intel-requesting", {
        method: "DELETE",
        body: JSON.stringify({ _id: req._id }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error();
      await fetchRequests();
      showNotification("Request deleted", "success");
    } catch (error) {
      showNotification("Delete failed", "error");
    }
  };

  const handlePrintBlank = () => {
    setShowBlankPreview(true);
  };

  // Print blank form (Form 01)
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

  // Print filled form
  const handlePrintModal = (req: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const attachmentsHtml = (req.attachments || []).map((att: any) => `<div>${att.filename} (${att.classification})</div>`).join('');
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

  // Filter & pagination
  const filtered = requests.filter((r: any) =>
    r.entities?.join(" ").toLowerCase().includes(search.toLowerCase()) ||
    r.purpose?.toLowerCase().includes(search.toLowerCase()) ||
    r.urgency?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const start = (currentPage - 1) * rowsPerPage;
  const paginated = filtered.slice(start, start + rowsPerPage);

  return (
    <div className="relative min-h-screen bg-gray-100">
      <Sidebar />
      <main className="md:ml-64 p-4 md:p-6 overflow-x-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-xl md:text-2xl font-bold">Intel Requests (Form 01)</h1>
          <div className="flex gap-3">
            <button
              onClick={handlePrintBlank}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md text-xs font-medium hover:border-black transition"
            >
              <Printer size={14} /> Print Blank Form
            </button>
            {!showForm && (
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md text-xs font-medium hover:border-black transition"
              >
                <Plus size={14} /> New Request
              </button>
            )}
          </div>
        </div>

        {notification && (
          <div
            className={`mb-4 px-4 py-2 rounded ${
              notification.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {notification.message}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-white shadow rounded-xl p-4 md:p-6 mb-6 space-y-6 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b pb-2 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold">
                {editData ? "Edit Request" : "New Request"}
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-black"
              >
                ✕
              </button>
            </div>

            {/* Entity */}
            <div>
              <label className="text-sm font-medium">Entity (select one or more) *</label>
              <select
                multiple
                value={selectedEntities}
                onChange={handleEntitySelect}
                className="w-full border rounded px-3 py-2 mt-1 h-32"
              >
                {entityOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hold Ctrl (Cmd on Mac) to select multiple</p>
              {selectedEntities.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedEntities.map((entity) => (
                    <div
                      key={entity}
                      className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm"
                    >
                      {entity}
                      <button
                        type="button"
                        onClick={() => removeEntity(entity)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {selectedEntities.length === 0 && (
                <p className="text-xs text-red-500 mt-1">At least one entity required</p>
              )}
            </div>

            {/* Purpose */}
            <div>
              <label className="text-sm font-medium">Purpose *</label>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={3}
                className="w-full border rounded px-3 py-2 mt-1"
                required
              />
            </div>

            {/* Urgency */}
            <div>
              <label className="text-sm font-medium">Urgency *</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">Select urgency</option>
                {urgencyOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Remarks */}
            <div>
              <label className="text-sm font-medium">Remarks</label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full border rounded px-3 py-2 mt-1"
              />
            </div>

            {/* Attachments with per-file classification */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">Attachments (each with classification)</label>
                <button
                  type="button"
                  onClick={addNewAttachment}
                  className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
                >
                  + Add File
                </button>
              </div>

              {existingAttachments.length > 0 && (
                <div className="space-y-3 mt-3">
                  <label className="text-xs font-semibold text-gray-500">Current Files:</label>
                  {existingAttachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-200"
                    >
                      <div className="flex items-center gap-2 break-all">
                        <FileText size={16} className="text-blue-500" />
                        <span className="text-sm">{att.filename}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            att.classification === "Confidential"
                              ? "bg-red-100 text-red-700"
                              : att.classification === "Secret"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {att.classification}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleViewFile(att.filename)} className="text-blue-500">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => handleDownloadFile(att.filename)} className="text-green-500">
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => handleRemoveExistingFile(att.filename)}
                          className="text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {attachments.map((att, idx) => (
                <div key={idx} className="mt-3 p-3 border border-gray-200 rounded-lg">
                  <div className="flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-xs text-gray-500">File</label>
                      <input
                        type="file"
                        onChange={(e) => updateAttachmentFile(idx, e.target.files![0])}
                        className="w-full text-sm border rounded p-1"
                      />
                      {att.file && <span className="text-xs text-green-600">{att.file.name}</span>}
                    </div>
                    <div className="w-40">
                      <label className="block text-xs text-gray-500">Classification</label>
                      <select
                        value={att.classification}
                        onChange={(e) => updateAttachmentClassification(idx, e.target.value)}
                        className="w-full border rounded px-2 py-1 text-sm"
                      >
                        {classificationOptions.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-red-500 mb-1"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {attachments.length === 0 && existingAttachments.length === 0 && (
                <p className="text-gray-400 text-sm mt-2">
                  No attachments. Click "Add File" to add documents with classification.
                </p>
              )}
            </div>

            {/* Requesting Agency */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Requesting Agency</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Name of Requesting Officer *</label>
                  <input
                    type="text"
                    value={requestingOfficer}
                    onChange={(e) => setRequestingOfficer(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Department</label>
                  <input
                    type="text"
                    value={requestingDepartment}
                    onChange={(e) => setRequestingDepartment(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Division</label>
                  <input
                    type="text"
                    value={requestingDivision}
                    onChange={(e) => setRequestingDivision(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Requesting Date</label>
                  <input
                    type="date"
                    value={requestingDate}
                    onChange={(e) => setRequestingDate(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700"
              >
                <Check size={14} /> Save Request
              </button>
            </div>
          </form>
        )}

        {/* Search & table toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by Entity, Purpose, Urgency..."
            className="w-full sm:w-80 px-4 py-2 border rounded focus:ring-2 focus:ring-blue-400 outline-none"
          />
          <div className="flex items-center gap-2 text-sm">
            <span>Show</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border rounded px-2 py-1"
            >
              {[10, 20, 30, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
            <span>entries</span>
          </div>
        </div>

        {/* Requests List Table */}
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="min-w-[800px] w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium uppercase">S/N</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium uppercase">Entity</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium uppercase">Purpose</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium uppercase">Urgency</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium uppercase">Attachments</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium uppercase">Requesting Officer</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium uppercase">Requesting Date</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginated.map((req, idx) => (
                <tr key={req._id} className="hover:bg-gray-100">
                  <td className="px-4 md:px-6 py-3 text-sm">{start + idx + 1}</td>
                  <td className="px-4 md:px-6 py-3 text-sm font-medium">
                    <div className="flex flex-wrap gap-1">
                      {req.entities?.map((e: string, i: number) => (
                        <span key={i} className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                          {e}
                        </span>
                      ))}
                    </div>
                  </td>
                  {/* Purpose column with "Read more" (maximize) icon */}
                  <td className="px-4 md:px-6 py-3 text-sm max-w-xs truncate">
                    <div className="flex items-center gap-2">
                      <span>{req.purpose?.substring(0, 40)}</span>
                      {req.purpose?.length > 40 && (
                        <button
                          onClick={() => setSelectedView(req)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <Maximize2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        req.urgency === "Critical"
                          ? "bg-red-100 text-red-800"
                          : req.urgency === "High"
                          ? "bg-orange-100 text-orange-800"
                          : req.urgency === "Medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {req.urgency}
                    </span>
                  </td>
                  <td className="px-4 md:px-6 py-3 text-sm">
                    {req.attachments?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {req.attachments.slice(0, 2).map((att: any, i: number) => {
                          const filename = typeof att === "string" ? att : att?.filename;
                          if (!filename) return null;
                          return (
                            <div
                              key={i}
                              className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"
                            >
                              <FileText size={12} className="text-gray-500" />
                              <span
                                className="text-xs truncate max-w-[60px] md:max-w-[80px]"
                                title={filename}
                              >
                                {filename.length > 15
                                  ? filename.substring(0, 15) + "..."
                                  : filename}
                              </span>
                              <button
                                onClick={() => handleViewFile(filename)}
                                className="text-blue-500"
                              >
                                <Eye size={12} />
                              </button>
                              <button
                                onClick={() => handleDownloadFile(filename)}
                                className="text-green-500"
                              >
                                <Download size={12} />
                              </button>
                            </div>
                          );
                        })}
                        {req.attachments.length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{req.attachments.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">No files</span>
                    )}
                  </td>
                  <td className="px-4 md:px-6 py-3 text-sm">
                    {req.requestingOfficer?.name || "—"}
                  </td>
                  <td className="px-4 md:px-6 py-3 text-sm">
                    {req.requestingDate ? new Date(req.requestingDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 md:px-6 py-3 text-sm flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedView(req)}
                      className="flex items-center gap-1 border rounded px-2 py-1 text-xs hover:border-black"
                    >
                      <Eye size={12} /> View
                    </button>
                    <button
                      onClick={() => handleEdit(req)}
                      className="flex items-center gap-1 border rounded px-2 py-1 text-xs hover:border-black"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(req)}
                      className="flex items-center gap-1 border rounded px-2 py-1 text-xs hover:border-black text-red-500"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-gray-500">
                    No requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-end items-center gap-4 mt-5 text-sm">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="font-semibold text-lg disabled:text-gray-400 hover:text-blue-600"
            >
              &lt;
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="font-semibold text-lg disabled:text-gray-400 hover:text-blue-600"
            >
              &gt;
            </button>
          </div>
        )}
      </main>

      {/* Modal for Viewing Filled Request – includes full purpose */}
      {selectedView && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md"
          onClick={() => setSelectedView(null)}
          style={{ animation: "fadeIn 0.2s ease-out" }}
        >
          <div
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl"
            style={{
              height: "90vh",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b bg-gray-50 pt-0 pb-2 px-4 md:px-6 flex-shrink-0">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex flex-col items-start">
                  <img
                    src="/form_logo.png"
                    alt="Logo"
                    style={{ height: "180px", width: "auto", margin: "-35px", display: "block", marginLeft: "-10px" }}
                  />
                  <div className="text-left">
                    <div className="text-lg font-bold">CoRE Network</div>
                    <div className="text-xs text-gray-500">
                      Coordinated Research & Intelligence Network of Bhutan
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-600">Form 01</div>
                  <div className="text-xl font-bold text-gray-800">Request Form</div>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-6 space-y-6 overflow-y-auto" style={{ flex: 1, minHeight: 0 }}>
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-xs font-semibold uppercase text-gray-500">
                  Entity/Entities
                </label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {selectedView.entities?.map((e: string, i: number) => (
                    <span
                      key={i}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                    >
                      {e}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-xs font-semibold uppercase text-gray-500">
                  Purpose
                </label>
                <div className="mt-1 text-gray-700 whitespace-pre-wrap">{selectedView.purpose}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-xs font-semibold uppercase text-gray-500">
                  Urgency
                </label>
                <div className="mt-1">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      selectedView.urgency === "Critical"
                        ? "bg-red-100 text-red-800"
                        : selectedView.urgency === "High"
                        ? "bg-orange-100 text-orange-800"
                        : selectedView.urgency === "Medium"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {selectedView.urgency}
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-xs font-semibold uppercase text-gray-500">
                  Remarks
                </label>
                <div className="mt-2 text-gray-700 whitespace-pre-wrap">
                  {selectedView.remarks || "—"}
                </div>
              </div>
              {selectedView.attachments?.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="text-xs font-semibold uppercase text-gray-500">
                    Attachments
                  </label>
                  <div className="mt-2 space-y-2">
                    {selectedView.attachments.map((att: any, i: number) => (
                      <div
                        key={i}
                        className="flex flex-wrap justify-between items-center bg-white p-2 rounded border"
                      >
                        <div className="flex items-center gap-2 break-all">
                          <FileText size={16} className="text-blue-500" />
                          <span className="text-sm">{att.filename}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              att.classification === "Confidential"
                                ? "bg-red-100 text-red-700"
                                : att.classification === "Secret"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {att.classification}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewFile(att.filename)}
                            className="text-blue-500"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleDownloadFile(att.filename)}
                            className="text-green-500"
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="border-t pt-6 mt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">
                  Requesting Agency
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Requesting Officer</label>
                    <div className="mt-1 p-2 border-b border-gray-300">
                      {selectedView.requestingOfficer?.name || "—"}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Department</label>
                    <div className="mt-1 p-2 border-b border-gray-300">
                      {selectedView.requestingOfficer?.department || "—"}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Division</label>
                    <div className="mt-1 p-2 border-b border-gray-300">
                      {selectedView.requestingOfficer?.division || "—"}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Requesting Date</label>
                    <div className="mt-1 p-2 border-b border-gray-300">
                      {selectedView.requestingDate
                        ? new Date(selectedView.requestingDate).toLocaleDateString()
                        : "—"}
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <label className="text-xs text-gray-500">Signature</label>
                  <div className="mt-1 p-2 border-b border-gray-300 italic text-gray-400">
                    Electronically submitted
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 md:p-6 border-t bg-gray-50 flex-shrink-0">
              <button
                onClick={() => handlePrintModal(selectedView)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm hover:border-gray-600 transition"
              >
                <div className="w-6 h-6 rounded-full border border-gray-400 flex items-center justify-center">
                  <Printer size={14} className="text-gray-600" />
                </div>
                Print Form (A4)
              </button>
              <button
                onClick={() => setSelectedView(null)}
                className="px-4 py-2 border rounded-md text-sm hover:border-black transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blank Preview Modal (unchanged) */}
      {showBlankPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md"
          onClick={() => setShowBlankPreview(false)}
          style={{ animation: "fadeIn 0.2s ease-out" }}
        >
          <div
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl"
            style={{
              height: "90vh",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b bg-gray-50 pt-0 pb-2 px-4 md:px-6 flex-shrink-0">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex flex-col items-start">
                  <img
                    src="/form_logo.png"
                    alt="Logo"
                    style={{ height: "180px", width: "auto", margin: "-35px", display: "block", marginLeft: "-10px" }}
                  />
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
              <button
                onClick={printBlankForm}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm hover:border-gray-600 transition"
              >
                <div className="w-6 h-6 rounded-full border border-gray-400 flex items-center justify-center">
                  <Printer size={14} className="text-gray-600" />
                </div>
                Print Form (A4)
              </button>
              <button
                onClick={() => setShowBlankPreview(false)}
                className="px-4 py-2 border rounded-md text-sm hover:border-black transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoomIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #print-blank-area,
          #print-blank-area * {
            visibility: visible;
          }
          #print-blank-area {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
}