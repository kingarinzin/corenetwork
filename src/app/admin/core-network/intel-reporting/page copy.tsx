"use client";

import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useIntelReports } from "@/features/intel-report/hooks/useIntelReports";
import { IntelReportDashboard } from "@/features/intel-report/components/IntelReportDashboard";
import { IntelReportTable } from "@/features/intel-report/components/IntelReportTable";
import { generateBlankReportHtml, generateReportEntryHtml } from "@/features/intel-report/utils/printTemplates";
import { Check, ShieldAlert, Printer } from "lucide-react";

export default function CoreNetworkPage() {
  const { reports, isLoading, notification, stats, saveReport, deleteReport, validateAndAddFile, showNotification, refresh } = useIntelReports();
  const [showBlankPreview, setShowBlankPreview] = useState(false);

  const triggerPrint = (htmlContent: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const printDoc = printWindow.document;
    printDoc.open(); printDoc.write(htmlContent); printDoc.close();
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-[#f4f7f9]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2c5282]"></div></div>;

  return (
    <div className="flex w-full min-h-screen bg-[#f4f7f9] text-black font-sans">
      <div className="fixed inset-y-0 left-0 z-20 bg-white shadow-xl"><Sidebar /></div>
      
      <main className="flex-1 w-full transition-all duration-300 lg:ml-64 p-4 lg:p-8">
        <div className="max-w-[1600px] mx-auto w-full space-y-6">
          <div className="bg-[#2c5282] rounded-lg p-4 text-center text-white shadow-md">
            <h1 className="text-lg font-medium tracking-wide">Core Network Intelligence Overview | As of {new Date().toLocaleDateString('en-GB')}</h1>
          </div>

          <IntelReportDashboard stats={stats} />

          {notification && (
            <div className={`px-4 py-3 rounded-lg shadow-md flex items-center gap-2 ${notification.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
              {notification.type === "success" ? <Check size={18} /> : <ShieldAlert size={18} />}
              {notification.message}
            </div>
          )}

          <IntelReportTable 
            data={reports}
            onDelete={deleteReport}
            onSave={saveReport}
            onValidateFile={validateAndAddFile}
            onDeleteFile={async (id, name) => {
                // Updated to point to the new secure API route
                await fetch("/api/core-network/intel-reporting/delete-file", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ entryId: id, fileName: name }),
                });
                await refresh();
            }}
            onPrintBlank={() => setShowBlankPreview(true)}
            onPrintEntry={(entry) => triggerPrint(generateReportEntryHtml(entry))}
            showNotification={showNotification}
          />

          {showBlankPreview && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowBlankPreview(false)}>
                <div className="bg-white rounded-xl p-6 shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                    <h2 className="text-xl font-bold mb-4">Blank Form Preview</h2>
                    <p className="text-gray-600 mb-6">Generate and print the blank A4 intelligence report?</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setShowBlankPreview(false)} className="px-4 py-2 border rounded-md text-sm font-bold text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button onClick={() => { triggerPrint(generateBlankReportHtml()); setShowBlankPreview(false); }} className="px-4 py-2 bg-[#2c5282] text-white rounded-md flex items-center gap-2 text-sm font-bold hover:bg-[#1e3a8a]">
                          <Printer size={16}/> Print Now
                        </button>
                    </div>
                </div>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}