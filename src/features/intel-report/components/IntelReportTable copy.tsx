"use client";

import React, { useState, useMemo, Fragment } from "react";
import { Trash2, Pencil, Save, Check, X, Plus, FileText, Download, Eye, Printer, Filter, RefreshCw, ChevronDown } from "lucide-react";
import { IntelReport, entityOptions, classificationOptions } from "../types";

type Props = {
  data: IntelReport[];
  onDelete: (id: string) => void;
  onSave: (formData: FormData, remarks: string, isEdit: boolean) => Promise<boolean>;
  onValidateFile: (file: File) => boolean;
  onDeleteFile: (entryId: string, fileName: string) => Promise<void>;
  onPrintBlank: () => void;
  onPrintEntry: (entry: IntelReport) => void;
  showNotification: (msg: string, type?: "success" | "error") => void;
};

export function IntelReportTable({ data, onDelete, onSave, onValidateFile, onDeleteFile, onPrintBlank, onPrintEntry, showNotification }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<IntelReport | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState("");
  const [filterClassification, setFilterClassification] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof IntelReport | null; direction: "asc" | "desc" }>({ key: null, direction: "asc" });

  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [classification, setClassification] = useState("");
  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState<{ file: File | null, classification: string }[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<{ filename: string; classification: string }[]>([]);

  const resetForm = () => {
    setEditData(null); setSelectedEntities([]); setClassification(""); setRemarks("");
    setAttachments([]); setExistingAttachments([]); setShowForm(false);
  };

  const handleEditClick = (entry: IntelReport) => {
    setEditData(entry); setSelectedEntities(entry.entities || []); setClassification(entry.classification); setRemarks(entry.remarks || "");
    setExistingAttachments(entry.attachments as any || []); setAttachments([]); setShowForm(true);
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRows(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const handleFileUpload = (idx: number, file: File) => {
    if (!onValidateFile(file)) return;
    const updated = [...attachments]; updated[idx].file = file; setAttachments(updated);
  };

  const handleAddAttachment = () => setAttachments([...attachments, { file: null, classification: "Confidential" }]);
  const handleRemoveAttachment = (idx: number) => setAttachments(attachments.filter((_, i) => i !== idx));
  const handleUpdateAttachmentClassification = (idx: number, classification: string) => {
    const updated = [...attachments]; updated[idx].classification = classification; setAttachments(updated);
  };

  const handleViewFile = (filename: string) => window.open(`/uploads/core-network/${filename}`, "_blank", "noopener,noreferrer");
  const handleDownloadFile = (filename: string) => {
    const link = document.createElement("a"); link.href = `/uploads/core-network/${filename}`; link.download = filename; link.rel = "noopener noreferrer";
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEntities.length === 0 || !classification) return showNotification("Entity and Classification are required", "error");

    const body = new FormData();
    body.append("entities", JSON.stringify(selectedEntities));
    body.append("classification", classification);
    body.append("submittedByName", "Sonam Wangchuk"); 
    body.append("submittedByDepartment", "ACC");
    body.append("submittedByDivision", "Investigation");

    const newAttachmentsMeta = [];
    for (let i = 0; i < attachments.length; i++) {
      if (attachments[i].file) {
        body.append(`attachment_${i}`, attachments[i].file!);
        newAttachmentsMeta.push({ classification: attachments[i].classification });
      }
    }
    body.append("newAttachments", JSON.stringify(newAttachmentsMeta));

    if (editData) {
      body.append("_id", editData._id);
      body.append("existingAttachments", JSON.stringify(existingAttachments));
    }

    const success = await onSave(body, remarks, !!editData);
    if (success) resetForm();
  };

  const { sortedEntries, totalPages, startIndex, paginatedEntries } = useMemo(() => {
    const filtered = data.filter((entry) => {
      const matchesSearch = (entry.remarks?.toLowerCase() || "").includes(search.toLowerCase()) || entry.entities?.some(e => e.toLowerCase().includes(search.toLowerCase()));
      return matchesSearch && (filterClassification === "" || entry.classification === filterClassification) && (filterEntity === "" || entry.entities?.includes(filterEntity));
    });

    const sorted = [...filtered].sort((a, b) => {
      if (!sortConfig.key) return 0;
      const aVal = a[sortConfig.key]; const bVal = b[sortConfig.key];
      if (aVal == null) return 1; if (bVal == null) return -1;
      if (typeof aVal === 'string' && typeof bVal === 'string') return sortConfig.direction === "asc" ? aVal.localeCompare(bVal) : -aVal.localeCompare(bVal);
      return aVal < bVal ? (sortConfig.direction === "asc" ? -1 : 1) : (sortConfig.direction === "asc" ? 1 : -1);
    });

    return {
      sortedEntries: sorted,
      totalPages: Math.ceil(sorted.length / rowsPerPage),
      startIndex: (currentPage - 1) * rowsPerPage,
      paginatedEntries: sorted.slice((currentPage - 1) * rowsPerPage, (currentPage - 1) * rowsPerPage + rowsPerPage)
    };
  }, [data, search, filterClassification, filterEntity, sortConfig, currentPage, rowsPerPage]);

  const handleSort = (key: keyof IntelReport) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };
  const getSortIcon = (key: keyof IntelReport) => sortConfig.key === key ? (sortConfig.direction === "asc" ? "↑" : "↓") : null;

  const renderFormFields = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-bold text-gray-700">Entity (select one or more) *</label>
          <select multiple value={selectedEntities} onChange={(e) => setSelectedEntities(Array.from(e.target.selectedOptions, o => o.value))} className="w-full border border-gray-300 rounded px-3 py-2 mt-1 h-24 text-sm focus:ring-2 focus:ring-[#2c5282] outline-none">
            {entityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <p className="text-xs text-gray-500 mt-1">Hold Ctrl (Cmd on Mac) to select multiple</p>
          {selectedEntities.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedEntities.map(entity => (
                <div key={entity} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                  {entity}
                  <button type="button" onClick={() => setSelectedEntities(selectedEntities.filter(e => e !== entity))} className="ml-1 text-blue-600 hover:text-blue-800"><X size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="text-sm font-bold text-gray-700">Data Classification *</label>
          <select value={classification} onChange={(e) => setClassification(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 mt-1 text-sm focus:ring-2 focus:ring-[#2c5282] outline-none" required>
            <option value="">Select Classification</option>
            {classificationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <label className="text-sm font-bold text-gray-700 mt-4 block">Remarks</label>
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} className="w-full border border-gray-300 rounded px-3 py-2 mt-1 text-sm focus:ring-2 focus:ring-[#2c5282] outline-none" />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-bold text-gray-700">Attachments</label>
          <button type="button" onClick={handleAddAttachment} className="text-xs bg-gray-100 px-3 py-1.5 rounded font-bold hover:bg-gray-200 text-gray-700 transition">+ Add Attachment</button>
        </div>
        {existingAttachments.length > 0 && (
          <div className="space-y-2 mb-3">
            {existingAttachments.map((att, idx) => (
              <div key={idx} className="flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-100">
                <div className="flex items-center gap-2"><FileText size={14} className="text-blue-500" /><span className="text-sm font-medium">{att.filename}</span><span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">{att.classification}</span></div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleViewFile(att.filename)} className="text-blue-500 hover:text-blue-700"><Eye size={14} /></button>
                  <button type="button" onClick={() => onDeleteFile(editData!._id, att.filename)} className="text-red-500 hover:text-red-700"><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
        {attachments.map((att, idx) => (
          <div key={idx} className="flex flex-wrap gap-2 items-center mt-2">
            <input type="file" onChange={(e) => e.target.files && handleFileUpload(idx, e.target.files[0])} className="text-sm border border-gray-300 rounded p-1 flex-1" />
            <select value={att.classification} onChange={(e) => handleUpdateAttachmentClassification(idx, e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm outline-none">
              {classificationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <button type="button" onClick={() => handleRemoveAttachment(idx)} className="text-red-500 hover:text-red-700"><X size={18} /></button>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 p-4 border-b border-gray-200 bg-[#f8fafc]">
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {!showForm && (
            <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-[#2c5282] text-white border rounded-md text-xs font-bold hover:bg-[#1e3a8a] transition shadow-sm">
              <Plus size={16} /> Add Entry
            </button>
          )}
          <button onClick={onPrintBlank} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm">
            <Printer size={16} /> Print Blank
          </button>
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="Search..." className="w-full sm:w-64 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2c5282] outline-none transition" />
          
          <div className="flex items-center gap-2 text-sm text-gray-600 font-medium ml-2"><Filter size={16} className="text-gray-400" /> Filters:</div>
          
          <select value={filterEntity} onChange={(e) => { setFilterEntity(e.target.value); setCurrentPage(1); }} className="border border-gray-300 rounded-md px-3 py-2 text-sm outline-none bg-white">
            <option value="">All Entities</option>{entityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <select value={filterClassification} onChange={(e) => { setFilterClassification(e.target.value); setCurrentPage(1); }} className="border border-gray-300 rounded-md px-3 py-2 text-sm outline-none bg-white">
            <option value="">All Classifications</option>{classificationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          
          {(search || filterClassification || filterEntity) && (
            <button onClick={() => { setSearch(""); setFilterClassification(""); setFilterEntity(""); setCurrentPage(1); }} className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-bold px-2 py-2">
              <RefreshCw size={14} /> Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm whitespace-nowrap text-gray-600">
          <span>Show</span>
          <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="border border-gray-300 rounded-md px-2 py-1 outline-none bg-white">
            <option value={10}>10</option><option value={20}>20</option><option value={30}>30</option><option value={40}>40</option>
          </select>
          <span className="font-bold text-[#2c5282]">{sortedEntries.length} records</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#f8fafc]">
            <tr>
              <th className="px-3 py-3 text-left text-[11px] font-bold text-[#2c5282] uppercase whitespace-nowrap">S/N</th>
              <th onClick={() => handleSort("classification")} className="px-3 py-3 text-left text-[11px] font-bold text-[#2c5282] uppercase cursor-pointer whitespace-nowrap">Classification {getSortIcon("classification")}</th>
              <th className="px-3 py-3 text-left text-[11px] font-bold text-[#2c5282] uppercase whitespace-nowrap">Entities</th>
              <th onClick={() => handleSort("remarks")} className="px-3 py-3 text-left text-[11px] font-bold text-[#2c5282] uppercase cursor-pointer whitespace-nowrap">Remarks {getSortIcon("remarks")}</th>
              <th className="px-3 py-3 text-left text-[11px] font-bold text-[#2c5282] uppercase whitespace-nowrap">Submitted By</th>
              <th onClick={() => handleSort("createdAt")} className="px-3 py-3 text-left text-[11px] font-bold text-[#2c5282] uppercase cursor-pointer whitespace-nowrap">Date {getSortIcon("createdAt")}</th>
              <th className="px-3 py-3 text-left text-[11px] font-bold text-[#2c5282] uppercase whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {showForm && !editData && (
              <tr className="bg-gray-50"><td colSpan={7} className="p-4 border-b">
                <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 relative overflow-hidden">
                  <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-[#2c5282] rounded-full"></div>
                  <div className="flex justify-between mb-4 items-center">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Plus size={18} className="text-[#2c5282]"/> Create New Entry</h2>
                    <button type="button" onClick={resetForm} className="text-gray-500 hover:text-gray-700 p-1"><X size={20} /></button>
                  </div>
                  {renderFormFields()}
                  <div className="flex justify-end gap-3 mt-5">
                    <button type="button" onClick={resetForm} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-bold text-gray-700 hover:bg-gray-50 transition"><X size={16} /> Cancel</button>
                    <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-[#2c5282] text-white rounded-md text-sm font-bold hover:bg-[#1e3a8a] transition shadow-sm"><Save size={16} /> Save Entry</button>
                  </div>
                </form>
              </td></tr>
            )}

            {paginatedEntries.map((entry, index) => {
              const isExpanded = expandedRows.has(entry._id);
              const isEditing = showForm && editData?._id === entry._id;
              const rowSNumber = startIndex + index + 1;
              return (
                <Fragment key={entry._id}>
                  <tr 
                    className={`hover:bg-gray-50 transition-colors align-top cursor-pointer border-b border-gray-100 ${isEditing ? 'bg-blue-50' : ''}`}
                    onClick={(e) => {
                      if (isEditing) return; 
                      if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('select') || (e.target as HTMLElement).closest('input')) return;
                      toggleRowExpand(entry._id);
                    }}
                  >
                    <td className="px-3 py-3 text-sm text-gray-500 font-medium">{rowSNumber}</td>
                    <td className="px-3 py-3 text-sm">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${entry.classification === "Confidential" ? "bg-purple-100 text-purple-800" : entry.classification === "Secret" ? "bg-teal-100 text-teal-800" : "bg-red-100 text-red-800"}`}>
                        {entry.classification}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm"><div className="flex flex-wrap gap-1 max-w-[150px]">{entry.entities?.map((e, i) => <span key={i} className="bg-gray-100 px-1.5 py-0.5 rounded text-xs border border-gray-200 text-gray-700">{e}</span>)}</div></td>
                    <td className="px-3 py-3 text-sm"><span className="text-gray-600 truncate block max-w-[200px]">{entry.remarks || '-'}</span></td>
                    <td className="px-3 py-3 text-sm whitespace-nowrap font-medium text-gray-700">{entry.submittedBy?.name || "—"}</td>
                    <td className="px-3 py-3 text-sm whitespace-nowrap text-gray-500">{new Date(entry.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-3 py-3 text-sm">
                      <div className="flex flex-wrap gap-1">
                        <button onClick={() => toggleRowExpand(entry._id)} className={`flex items-center gap-1 border rounded px-2 py-1 text-xs font-medium transition ${isExpanded ? "bg-blue-50 text-blue-600 border-blue-300" : "border-gray-200 hover:bg-gray-100 text-gray-600"}`}>
                          {isExpanded ? <ChevronDown size={12} className="rotate-180" /> : <ChevronDown size={12} />} {isExpanded ? "Hide" : "View"}
                        </button>
                        <button onClick={() => handleEditClick(entry)} className={`flex items-center gap-1 border rounded px-2 py-1 text-xs font-medium transition ${isEditing ? 'bg-blue-100 border-blue-400 text-blue-800' : 'border-gray-200 hover:bg-gray-100 text-gray-600'}`}>
                          <Pencil size={12} /> Edit
                        </button>
                        <button onClick={() => onDelete(entry._id)} className="flex items-center gap-1 border border-red-100 rounded px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 transition">
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>

                  {isEditing && (
                    <tr><td colSpan={7} className="p-4 bg-gray-50 border-b border-gray-200">
                      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 relative overflow-hidden">
                        <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-[#2c5282] rounded-full"></div>
                        <div className="flex justify-between mb-4 items-center">
                          <h2 className="text-lg font-bold text-[#2c5282] flex items-center gap-2"><Pencil size={18} /> Edit Entry</h2>
                          <button type="button" onClick={resetForm} className="text-gray-500 hover:text-gray-700 p-1"><X size={20} /></button>
                        </div>
                        {renderFormFields()}
                        <div className="flex justify-end gap-3 mt-5">
                          <button type="button" onClick={resetForm} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-bold text-gray-700 hover:bg-gray-50 transition"><X size={16} /> Cancel</button>
                          <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-[#2c5282] text-white rounded-md text-sm font-bold hover:bg-[#1e3a8a] transition shadow-sm"><Check size={16} /> Save Changes</button>
                        </div>
                      </form>
                    </td></tr>
                  )}

                  {isExpanded && !isEditing && (
                    <tr><td colSpan={7} className="px-6 py-6 bg-[#f8fafc] border-b border-gray-200 shadow-inner">
                      <div className="space-y-6 max-w-5xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <label className="text-xs font-bold text-[#2c5282] uppercase tracking-wider block mb-2">Entities</label>
                            <div className="flex flex-wrap gap-2 mt-1">{entry.entities?.map((e, i) => <span key={i} className="bg-white border border-gray-300 px-2.5 py-1 rounded-md text-sm font-medium text-gray-700 shadow-sm">{e}</span>)}</div>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-[#2c5282] uppercase tracking-wider block mb-2">Classification</label>
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-1 ${entry.classification === "Confidential" ? "bg-purple-100 text-purple-800 border border-purple-200" : entry.classification === "Secret" ? "bg-teal-100 text-teal-800 border border-teal-200" : "bg-red-100 text-red-800 border border-red-200"}`}>{entry.classification}</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-[#2c5282] uppercase tracking-wider block mb-2">Remarks</label>
                          <p className="text-sm text-gray-800 bg-white p-4 rounded-lg border border-gray-200 shadow-sm leading-relaxed">{entry.remarks || "No remarks provided."}</p>
                        </div>
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
                                    {classType !== 'N/A' && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${classType === "Confidential" ? "bg-purple-100 text-purple-700" : classType === "Secret" ? "bg-teal-100 text-teal-700" : "bg-red-100 text-red-700"}`}>{classType}</span>}
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
                        <div className="pt-4 border-t border-gray-200">
                          <h4 className="text-xs font-bold text-[#2c5282] uppercase tracking-wider mb-3">Submission Information</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <div><label className="text-xs font-bold text-gray-500">Submitted By</label><div className="text-sm font-medium text-gray-800 mt-1">{entry.submittedBy?.name || "—"}</div></div>
                            <div><label className="text-xs font-bold text-gray-500">Department</label><div className="text-sm text-gray-800 mt-1">{entry.submittedBy?.department || "—"}</div></div>
                            <div><label className="text-xs font-bold text-gray-500">Division</label><div className="text-sm text-gray-800 mt-1">{entry.submittedBy?.division || "—"}</div></div>
                            <div><label className="text-xs font-bold text-gray-500">Date</label><div className="text-sm text-gray-800 mt-1">{new Date(entry.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div></div>
                          </div>
                        </div>
                        <div className="flex justify-end mt-4">
                          <button onClick={() => onPrintEntry(entry)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-bold text-gray-700 hover:bg-gray-100 transition shadow-sm"><Printer size={16} /> Print Form (A4)</button>
                        </div>
                      </div>
                    </td></tr>
                  )}
                </Fragment>
              );
            })}
            {paginatedEntries.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-500 font-medium">No records found.</td></tr>}
          </tbody>
        </table>
      </div>

      {totalPages > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-4 py-3 bg-[#f8fafc] border-t border-gray-200 text-sm text-gray-600 rounded-b-lg">
          <div>Showing <span className="font-bold">{startIndex + 1}</span> to <span className="font-bold">{Math.min(startIndex + rowsPerPage, sortedEntries.length)}</span> of <span className="font-bold">{sortedEntries.length}</span> records</div>
          <div className="flex items-center gap-3">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p-1)} className="px-3 py-1 bg-white border border-gray-300 rounded font-semibold disabled:opacity-50">Prev</button>
            <span className="font-medium text-gray-700">Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p+1)} className="px-3 py-1 bg-white border border-gray-300 rounded font-semibold disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}