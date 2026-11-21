"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback, Fragment } from "react";
import {
  Trash2, Pencil, Save, Check, X, Plus, FileText, Download, Eye, Printer,
  Filter, RefreshCw, ChevronDown, Search, AlertCircle, Info, Upload,
  Paperclip, ClipboardList, Inbox,
} from "lucide-react";
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

/* ------------------------------------------------------------------ */
/*  Shared style tokens                                                */
/* ------------------------------------------------------------------ */
const LABEL_CLS = "text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5";
const INPUT_CLS =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-800 " +
  "focus:ring-2 focus:ring-[#2c5282]/40 focus:border-[#2c5282] outline-none transition placeholder:text-gray-400";
const REQUIRED_MARK = <span className="text-red-500 ml-0.5">*</span>;

const classificationBadge = (val: string) => {
  switch (val) {
    case "Confidential":
      return "bg-purple-50 text-purple-700 border border-purple-200/60";
    case "Secret":
      return "bg-teal-50 text-teal-700 border border-teal-200/60";
    default:
      return "bg-red-50 text-red-700 border border-red-200/60";
  }
};

/* ------------------------------------------------------------------ */
/*  Entity Picker                                                      */
/* ------------------------------------------------------------------ */
function EntityPicker({
  selected,
  onChange,
  error,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => entityOptions.filter((o) => o.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt]);
  };

  return (
    <div>
      <label className={LABEL_CLS}>
        Entities {REQUIRED_MARK}
      </label>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((entity) => (
            <span
              key={entity}
              className="inline-flex items-center gap-1 bg-[#2c5282]/10 text-[#2c5282] border border-[#2c5282]/20 px-2 py-1 rounded-md text-xs font-semibold"
            >
              {entity}
              <button
                type="button"
                onClick={() => toggle(entity)}
                className="hover:text-red-600 transition"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div
        className={`rounded-lg border bg-white overflow-hidden transition ${
          error
            ? "border-red-400 ring-1 ring-red-200"
            : "border-gray-300 focus-within:border-[#2c5282] focus-within:ring-2 focus-within:ring-[#2c5282]/30"
        }`}
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entities…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>

        <div className="max-h-40 overflow-y-auto divide-y divide-gray-100">
          {filtered.length === 0 && (
            <div className="px-3 py-4 text-xs text-gray-400 text-center italic">
              No entities match "{query}"
            </div>
          )}
          {filtered.map((opt) => {
            const isChecked = selected.includes(opt);
            return (
              <label
                key={opt}
                className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer text-sm transition ${
                  isChecked ? "bg-blue-50 text-[#2c5282] font-semibold" : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(opt)}
                  className="accent-[#2c5282] w-4 h-4 cursor-pointer"
                />
                {opt}
              </label>
            );
          })}
        </div>
      </div>

      {error ? (
        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      ) : (
        <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
          <Info size={11} /> Select all applicable entities. Use the search box to filter.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export function IntelReportTable({
  data,
  onDelete,
  onSave,
  onValidateFile,
  onDeleteFile,
  onPrintBlank,
  onPrintEntry,
  showNotification,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<IntelReport | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState("");
  const [filterClassification, setFilterClassification] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof IntelReport | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });

  /* --- form state --- */
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [classification, setClassification] = useState("");
  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState<{ file: File | null; classification: string }[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<{ filename: string; classification: string }[]>([]);

  /* --- UX state --- */
  const [errors, setErrors] = useState<{ entities?: string; classification?: string; files?: string }>({});
  const [isDirty, setIsDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const formRef = useRef<HTMLDivElement | null>(null);
  const remarksLimit = 1000;

  useEffect(() => {
    if (showForm) {
      const t = setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
      return () => clearTimeout(t);
    }
  }, [showForm, editData]);

  const markDirty = () => setIsDirty(true);

  const resetForm = () => {
    setEditData(null);
    setSelectedEntities([]);
    setClassification("");
    setRemarks("");
    setAttachments([]);
    setExistingAttachments([]);
    setErrors({});
    setIsDirty(false);
    setSavedFlash(false);
    setShowForm(false);
  };

  const handleCancel = () => {
    if (isDirty && !window.confirm("You have unsaved changes. Discard them?")) return;
    resetForm();
  };

  const handleEditClick = (entry: IntelReport) => {
    setEditData(entry);
    setSelectedEntities(entry.entities || []);
    setClassification(entry.classification);
    setRemarks(entry.remarks || "");
    setExistingAttachments((entry.attachments as any) || []);
    setAttachments([]);
    setErrors({});
    setIsDirty(false);
    setShowForm(true);
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleFileUpload = (idx: number, file: File) => {
    if (!onValidateFile(file)) return;
    const updated = [...attachments];
    updated[idx].file = file;
    setAttachments(updated);
    setErrors((e) => ({ ...e, files: undefined }));
    markDirty();
  };

  const handleAddAttachment = () => {
    setAttachments([...attachments, { file: null, classification: "" }]);
    markDirty();
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments(attachments.filter((_, i) => i !== idx));
    markDirty();
  };

  const handleUpdateAttachmentClassification = (idx: number, val: string) => {
    const updated = [...attachments];
    updated[idx].classification = val;
    setAttachments(updated);
    markDirty();
  };

  const handleViewFile = (filename: string) =>
    window.open(`/uploads/core-network/${filename}`, "_blank", "noopener,noreferrer");

  const handleDownloadFile = (filename: string) => {
    const link = document.createElement("a");
    link.href = `/uploads/core-network/${filename}`;
    link.download = filename;
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validateForm = useCallback(() => {
    const next: { entities?: string; classification?: string; files?: string } = {};
    if (selectedEntities.length === 0) next.entities = "Please select at least one entity.";
    if (!classification) next.classification = "Please choose a classification level.";
    const missingFile = attachments.find((a) => a.file && !a.classification);
    if (missingFile) next.files = "Every new attachment must have a classification.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [selectedEntities, classification, attachments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      showNotification("Please fix the highlighted fields.", "error");
      return;
    }

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
    if (success) {
      setSavedFlash(true);
      setTimeout(() => resetForm(), 500);
    }
  };

  const { sortedEntries, totalPages, startIndex, paginatedEntries } = useMemo(() => {
    const filtered = data.filter((entry) => {
      const matchesSearch =
        (entry.remarks?.toLowerCase() || "").includes(search.toLowerCase()) ||
        entry.entities?.some((e) => e.toLowerCase().includes(search.toLowerCase()));
      return (
        matchesSearch &&
        (filterClassification === "" || entry.classification === filterClassification) &&
        (filterEntity === "" || entry.entities?.includes(filterEntity))
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      if (!sortConfig.key) return 0;
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "string" && typeof bVal === "string")
        return sortConfig.direction === "asc"
          ? aVal.localeCompare(bVal)
          : -aVal.localeCompare(bVal);
      return aVal < bVal
        ? sortConfig.direction === "asc"
          ? -1
          : 1
        : sortConfig.direction === "asc"
        ? 1
        : -1;
    });

    return {
      sortedEntries: sorted,
      totalPages: Math.ceil(sorted.length / rowsPerPage),
      startIndex: (currentPage - 1) * rowsPerPage,
      paginatedEntries: sorted.slice((currentPage - 1) * rowsPerPage, (currentPage - 1) * rowsPerPage + rowsPerPage),
    };
  }, [data, search, filterClassification, filterEntity, sortConfig, currentPage, rowsPerPage]);

  const handleSort = (key: keyof IntelReport) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };
  const getSortIcon = (key: keyof IntelReport) =>
    sortConfig.key === key ? (sortConfig.direction === "asc" ? "↑" : "↓") : null;

  /* --------------------------------------------------------------- */
  /*  Shared Form Body                                                */
  /* --------------------------------------------------------------- */
  const renderFormFields = () => (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
          <ClipboardList size={15} className="text-[#2c5282]" />
          <h3 className="text-xs font-bold text-[#2c5282] uppercase tracking-wider">Report Details</h3>
        </div>

        <div className="space-y-4">
          <EntityPicker
            selected={selectedEntities}
            onChange={(next) => {
              setSelectedEntities(next);
              if (errors.entities) setErrors((e) => ({ ...e, entities: undefined }));
              markDirty();
            }}
            error={errors.entities}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Classification {REQUIRED_MARK}</label>
              <select
                value={classification}
                onChange={(e) => {
                  setClassification(e.target.value);
                  if (errors.classification) setErrors((er) => ({ ...er, classification: undefined }));
                  markDirty();
                }}
                className={`${INPUT_CLS} ${errors.classification ? "border-red-400 ring-1 ring-red-200" : ""}`}
              >
                <option value="">Select classification…</option>
                {classificationOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {errors.classification && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.classification}
                </p>
              )}
            </div>

            <div>
              <label className={LABEL_CLS}>Description</label>
              <textarea
                value={remarks}
                onChange={(e) => {
                  if (e.target.value.length <= remarksLimit) {
                    setRemarks(e.target.value);
                    markDirty();
                  }
                }}
                rows={4}
                placeholder="Add any relevant notes, context, or descriptions…"
                className={`${INPUT_CLS} resize-y min-h-[96px]`}
              />
              <div className="flex justify-end mt-1">
                <span className={`text-[11px] ${remarks.length > remarksLimit * 0.9 ? "text-amber-600" : "text-gray-400"}`}>
                  {remarks.length} / {remarksLimit}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Paperclip size={15} className="text-[#2c5282]" />
            <h3 className="text-xs font-bold text-[#2c5282] uppercase tracking-wider">Attachments</h3>
            <span className="text-[10px] text-gray-400 font-medium">(optional)</span>
          </div>
          <button
            type="button"
            onClick={handleAddAttachment}
            className="inline-flex items-center gap-1 text-[11px] bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-md font-bold text-gray-700 transition"
          >
            <Plus size={12} /> Add attachment
          </button>
        </div>

        {existingAttachments.length > 0 && (
          <div className="space-y-2 mb-3">
            {existingAttachments.map((att, idx) => (
              <div key={idx} className="flex justify-between items-center bg-blue-50/60 p-2.5 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={14} className="text-blue-500 shrink-0" />
                  <span className="text-sm font-medium text-gray-700 truncate">{att.filename}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${classificationBadge(att.classification)}`}>
                    {att.classification}
                  </span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleViewFile(att.filename)}
                    className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded transition"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteFile(editData!._id, att.filename)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {attachments.length > 0 && (
          <div className="space-y-2">
            {attachments.map((att, idx) => (
              <div key={idx} className="relative flex flex-col sm:flex-row gap-2 sm:items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="flex-1 min-w-0">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 bg-white border border-gray-300 rounded-lg px-3 py-2 hover:border-[#2c5282] transition">
                    <Upload size={14} className="text-[#2c5282] shrink-0" />
                    <span className="truncate">{att.file ? att.file.name : "Choose a file…"}</span>
                    <input type="file" onChange={(e) => e.target.files && handleFileUpload(idx, e.target.files[0])} className="hidden" />
                  </label>
                </div>

                <select
                  value={att.classification}
                  onChange={(e) => handleUpdateAttachmentClassification(idx, e.target.value)}
                  className={`border rounded-lg px-2.5 py-2 text-sm outline-none bg-white w-full sm:w-40 transition ${
                    att.file && !att.classification ? "border-red-300" : "border-gray-300"
                  }`}
                >
                  <option value="">Classification…</option>
                  {classificationOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(idx)}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition self-end sm:self-auto"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {errors.files && (
          <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
            <AlertCircle size={12} /> {errors.files}
          </p>
        )}

        {attachments.length === 0 && existingAttachments.length === 0 && (
          <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center">
            <Paperclip size={18} className="text-gray-300 mx-auto mb-1" />
            <p className="text-xs text-gray-400">No attachments. Click "Add attachment" to upload files.</p>
          </div>
        )}
      </div>
    </div>
  );

  /* --------------------------------------------------------------- */
  /*  Shared Form Shell                                               */
  /* --------------------------------------------------------------- */
  const renderFormShell = (mode: "create" | "edit") => {
    const isEdit = mode === "edit";
    return (
      <div
        ref={formRef}
        className={`bg-white rounded-xl border shadow-sm relative overflow-hidden transition ${
          savedFlash ? "border-green-400 ring-2 ring-green-100" : "border-gray-200"
        }`}
      >
        <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-[#2c5282] rounded-full" />

        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                {isEdit ? (
                  <><Pencil size={18} className="text-[#2c5282]" /> Edit Entry</>
                ) : (
                  <><Plus size={18} className="text-[#2c5282]" /> Create New Entry</>
                )}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Fill in the details below. Fields marked <span className="text-red-500 font-bold">*</span> are required.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-100 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5">{renderFormFields()}</div>

          <div className="sticky bottom-0 px-6 py-3 bg-white/95 backdrop-blur border-t border-gray-200 flex justify-end gap-3 rounded-b-xl">
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
            >
              <X size={16} /> Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 bg-[#2c5282] text-white rounded-lg text-sm font-bold hover:bg-[#1e3a8a] transition shadow-sm disabled:opacity-70"
              disabled={savedFlash}
            >
              {savedFlash ? <Check size={16} /> : <Save size={16} />}
              {savedFlash ? "Saved!" : isEdit ? "Save Changes" : "Save Entry"}
            </button>
          </div>
        </form>
      </div>
    );
  };

  /* --------------------------------------------------------------- */
  /*  Enterprise Render                                               */
  /* --------------------------------------------------------------- */
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 p-4 border-b border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {!showForm && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#2c5282] text-white rounded-lg text-xs font-bold hover:bg-[#1e3a8a] transition shadow-sm"
            >
              <Plus size={16} /> Add Entry
            </button>
          )}
          <button
            onClick={onPrintBlank}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm"
          >
            <Printer size={16} /> Print Blank
          </button>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search records..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2c5282]/40 focus:border-[#2c5282] outline-none transition"
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500 font-medium ml-2">
            <Filter size={16} className="text-gray-400" /> Filters:
          </div>

          <select
            value={filterEntity}
            onChange={(e) => {
              setFilterEntity(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none bg-white focus:ring-2 focus:ring-[#2c5282]/40 focus:border-[#2c5282]"
          >
            <option value="">All Entities</option>
            {entityOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <select
            value={filterClassification}
            onChange={(e) => {
              setFilterClassification(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none bg-white focus:ring-2 focus:ring-[#2c5282]/40 focus:border-[#2c5282]"
          >
            <option value="">All Classifications</option>
            {classificationOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>

          {(search || filterClassification || filterEntity) && (
            <button
              onClick={() => {
                setSearch("");
                setFilterClassification("");
                setFilterEntity("");
                setCurrentPage(1);
              }}
              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-bold px-2 py-2"
            >
              <RefreshCw size={14} /> Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm whitespace-nowrap text-gray-600">
          <span>Show</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded-lg px-2 py-1.5 outline-none bg-white focus:ring-2 focus:ring-[#2c5282]/40 focus:border-[#2c5282]"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
            <option value={40}>40</option>
          </select>
          <span className="font-bold text-[#2c5282] bg-blue-50 px-2.5 py-1 rounded-md">{sortedEntries.length} records</span>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#f8fafc]">
            <tr>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap w-16">S/N</th>
              <th
                onClick={() => handleSort("classification")}
                className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  Classification {getSortIcon("classification")}
                </div>
              </th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Entities</th>
              <th
                onClick={() => handleSort("remarks")}
                className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition whitespace-nowrap w-1/3"
              >
                <div className="flex items-center gap-1">
                  Description {getSortIcon("remarks")}
                </div>
              </th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Submitted By</th>
              <th
                onClick={() => handleSort("createdAt")}
                className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  Date {getSortIcon("createdAt")}
                </div>
              </th>
              <th className="px-4 py-3.5 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap w-48">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {/* New entry row */}
            {showForm && !editData && (
              <tr className="bg-gray-50/50">
                <td colSpan={7} className="p-5 border-b border-gray-200">
                  {renderFormShell("create")}
                </td>
              </tr>
            )}

            {paginatedEntries.map((entry, index) => {
              const isExpanded = expandedRows.has(entry._id);
              const isEditing = showForm && editData?._id === entry._id;
              const rowSNumber = startIndex + index + 1;

              return (
                <Fragment key={entry._id}>
                  <tr
                    className={`group hover:bg-gray-50/80 transition-colors align-middle ${
                      isEditing ? "bg-blue-50/50" : ""
                    }`}
                    onClick={(e) => {
                      if (isEditing) return;
                      if (
                        (e.target as HTMLElement).closest("button") ||
                        (e.target as HTMLElement).closest("select") ||
                        (e.target as HTMLElement).closest("input")
                      ) return;
                      toggleRowExpand(entry._id);
                    }}
                  >
                    <td className="px-4 py-4 text-sm text-gray-500 font-medium">{rowSNumber}</td>
                    
                    <td className="px-4 py-4 text-sm">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide whitespace-nowrap shadow-sm ${classificationBadge(entry.classification)}`}>
                        {entry.classification}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-sm">
                      <div className="flex items-center gap-1.5 max-w-[200px]">
                        {entry.entities?.slice(0, 2).map((e, i) => (
                          <span key={i} className="bg-gray-100 px-2 py-1 rounded-md text-xs font-medium border border-gray-200 text-gray-700 whitespace-nowrap">
                            {e}
                          </span>
                        ))}
                        {entry.entities && entry.entities.length > 2 && (
                          <div className="relative group/tooltip">
                            <span className="bg-gray-100 hover:bg-gray-200 cursor-help px-2 py-1 rounded-md text-xs font-bold border border-gray-200 text-gray-500 transition">
                              +{entry.entities.length - 2}
                            </span>
                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full left-0 mb-1 hidden group-hover/tooltip:block z-10 w-max max-w-xs bg-gray-800 text-white text-xs rounded-md py-1.5 px-3 shadow-xl">
                              {entry.entities.slice(2).join(", ")}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm align-middle">
                      {/* Truncated to exactly 2 lines with native hover tooltip for full text */}
                      <div 
                        className="text-gray-600 leading-relaxed max-w-md cursor-help"
                        title={entry.remarks || "No description"}
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {entry.remarks || <span className="text-gray-400 italic">No description</span>}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#2c5282]/10 text-[#2c5282] flex items-center justify-center text-[10px] font-bold shrink-0">
                          {entry.submittedBy?.name?.charAt(0) || "U"}
                        </div>
                        <span className="font-medium text-gray-700">{entry.submittedBy?.name || "—"}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-500">
                      {new Date(entry.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td className="px-4 py-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => toggleRowExpand(entry._id)}
                          className={`flex items-center gap-1.5 border rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                            isExpanded
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-white border-gray-200 hover:bg-gray-50 text-gray-600"
                          }`}
                          title="View Details"
                        >
                          {isExpanded ? <ChevronDown size={14} className="rotate-180" /> : <ChevronDown size={14} />}
                          {isExpanded ? "Hide" : "View"}
                        </button>
                        <button
                          onClick={() => handleEditClick(entry)}
                          className={`flex items-center gap-1.5 border rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                            isEditing
                              ? "bg-blue-100 border-blue-300 text-blue-800"
                              : "bg-white border-gray-200 hover:bg-gray-50 text-gray-600"
                          }`}
                          title="Edit Entry"
                        >
                          <Pencil size={14} /> Edit
                        </button>
                        <button
                          onClick={() => onDelete(entry._id)}
                          className="flex items-center gap-1.5 border border-gray-200 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition"
                          title="Delete Entry"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Edit form row */}
                  {isEditing && (
                    <tr>
                      <td colSpan={7} className="p-5 bg-gray-50/50 border-b border-gray-200">
                        {renderFormShell("edit")}
                      </td>
                    </tr>
                  )}

                  {/* Expanded detail row */}
                  {isExpanded && !isEditing && (
                    <tr>
                      <td colSpan={7} className="px-6 py-6 bg-[#f8fafc] border-b border-gray-200 shadow-inner">
                        <div className="space-y-6 max-w-5xl mx-auto">
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <label className="text-xs font-bold text-[#2c5282] uppercase tracking-wider block mb-2">
                                Entities
                              </label>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {entry.entities?.map((e, i) => (
                                  <span key={i} className="bg-white border border-gray-200 px-2.5 py-1 rounded-md text-sm font-medium text-gray-700 shadow-sm">
                                    {e}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-bold text-[#2c5282] uppercase tracking-wider block mb-2">
                                Classification
                              </label>
                              <span className={`inline-block px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide mt-1 shadow-sm ${classificationBadge(entry.classification)}`}>
                                {entry.classification}
                              </span>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-[#2c5282] uppercase tracking-wider block mb-2">
                              Description
                            </label>
                            <p className="text-sm text-gray-800 bg-white p-4 rounded-lg border border-gray-200 shadow-sm leading-relaxed whitespace-pre-wrap">
                              {entry.remarks || "No description provided."}
                            </p>
                          </div>
                          {entry.attachments && entry.attachments.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-[#2c5282] uppercase tracking-wider mb-2">
                                Attachments
                              </h4>
                              <div className="flex flex-wrap gap-3">
                                {entry.attachments.map((att: any, i: number) => {
                                  const fileName = typeof att === "string" ? att : att.filename;
                                  const classType = typeof att === "string" ? "N/A" : att.classification;
                                  return (
                                    <div key={i} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm hover:border-blue-300 transition">
                                      <FileText size={16} className="text-blue-500" />
                                      <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                                        {fileName}
                                      </span>
                                      {classType !== "N/A" && (
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${classificationBadge(classType)}`}>
                                          {classType}
                                        </span>
                                      )}
                                      <div className="flex items-center gap-1 border-l border-gray-200 pl-2 ml-1">
                                        <button onClick={() => handleViewFile(fileName)} className="text-blue-500 hover:text-blue-700 p-1" title="View">
                                          <Eye size={16} />
                                        </button>
                                        <button onClick={() => handleDownloadFile(fileName)} className="text-green-500 hover:text-green-700 p-1" title="Download">
                                          <Download size={16} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          <div className="pt-4 border-t border-gray-200">
                            <h4 className="text-xs font-bold text-[#2c5282] uppercase tracking-wider mb-3">
                              Submission Information
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                              <div>
                                <label className="text-xs font-bold text-gray-500">Submitted By</label>
                                <div className="text-sm font-medium text-gray-800 mt-1">{entry.submittedBy?.name || "—"}</div>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-500">Department</label>
                                <div className="text-sm text-gray-800 mt-1">{entry.submittedBy?.department || "—"}</div>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-500">Division</label>
                                <div className="text-sm text-gray-800 mt-1">{entry.submittedBy?.division || "—"}</div>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-500">Date</label>
                                <div className="text-sm text-gray-800 mt-1">
                                  {new Date(entry.createdAt).toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end mt-4">
                            <button
                              onClick={() => onPrintEntry(entry)}
                              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-bold text-gray-700 hover:bg-gray-100 transition shadow-sm"
                            >
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
            
            {paginatedEntries.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <Inbox size={32} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No records found</p>
                  <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ───────────────────────────────────────────── */}
      {totalPages > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-4 py-3 bg-white border-t border-gray-200 text-sm text-gray-600 rounded-b-xl">
          <div>
            Showing <span className="font-bold text-gray-800">{startIndex + 1}</span> to{" "}
            <span className="font-bold text-gray-800">{Math.min(startIndex + rowsPerPage, sortedEntries.length)}</span> of{" "}
            <span className="font-bold text-gray-800">{sortedEntries.length}</span> entries
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-md font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition shadow-sm"
            >
              Prev
            </button>
            <span className="font-medium text-gray-700 px-2 bg-gray-50 py-1.5 rounded-md border border-gray-200">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-md font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition shadow-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}