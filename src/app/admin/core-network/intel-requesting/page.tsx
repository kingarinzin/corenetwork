"use client";

import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useIntelRequests } from "@/features/intel-request/hooks/useIntelRequests";
import { IntelRequestDashboard } from "@/features/intel-request/components/IntelRequestDashboard";
import { IntelRequestTable } from "@/features/intel-request/components/IntelRequestTable";
import { generateBlankPrintHtml, generateEntryPrintHtml } from "@/features/intel-request/utils/printTemplates";
import { Check, ShieldAlert, Printer } from "lucide-react";

export default function IntelRequestPage() {
  const {
    requests, isLoading, notification, stats, saveRequest, deleteRequest,
    validateAndAddFile, showNotification, refresh,
  } = useIntelRequests();

  const [showBlankPreview, setShowBlankPreview] = useState(false);

  const handlePrintBlank = () => setShowBlankPreview(true);

  const triggerPrint = (htmlContent: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const printDoc = printWindow.document;
    printDoc.open();
    printDoc.write(htmlContent);
    printDoc.close();
  };

  const handlePrintEntry = (req: any) => triggerPrint(generateEntryPrintHtml(req));

  const handleExecuteBlankPrint = () => {
    triggerPrint(generateBlankPrintHtml());
    setShowBlankPreview(false);
  };

  if (isLoading) {
    return (
      <div className="flex w-full min-h-screen bg-[#f4f7f9] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2c5282]"></div>
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-screen bg-[#f4f7f9] text-black font-sans">
      <div className="fixed inset-y-0 left-0 z-20 bg-white shadow-xl">
        <Sidebar />
      </div>
      
      <main className="flex-1 w-full transition-all duration-300 lg:ml-64 p-4 lg:p-8">
        <div className="max-w-[1600px] mx-auto w-full space-y-6">
          
          <div className="bg-[#2c5282] rounded-lg p-4 text-center text-white shadow-md">
            <h1 className="text-lg font-medium tracking-wide">
              Intelligence Request Overview | As of {new Date().toLocaleDateString('en-GB')}
            </h1>
          </div>

          <IntelRequestDashboard stats={stats} />

          {notification && (
            <div className={`px-4 py-3 rounded-lg shadow-md flex items-center gap-2 ${notification.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
              {notification.type === "success" ? <Check size={18} /> : <ShieldAlert size={18} />}
              {notification.message}
            </div>
          )}

          <IntelRequestTable 
            data={requests}
            onDelete={deleteRequest}
            onSave={saveRequest}
            onValidateFile={validateAndAddFile}
            onDeleteFile={async (id, name) => {
                await fetch("/api/core-network/intel-requesting/delete-file", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ entryId: id, fileName: name }),
                });
                await refresh();
            }}
            onPrintBlank={handlePrintBlank}
            onPrintEntry={handlePrintEntry}
            showNotification={showNotification}
          />

          {showBlankPreview && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowBlankPreview(false)}>
                <div className="bg-white rounded-xl p-6 shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                    <h2 className="text-xl font-bold mb-4">Blank Form Preview</h2>
                    <p className="text-gray-600 mb-6">Are you ready to generate and print the blank A4 intelligence request form?</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setShowBlankPreview(false)} className="px-4 py-2 border rounded-md text-sm font-bold text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button onClick={handleExecuteBlankPrint} className="px-4 py-2 bg-[#2c5282] text-white rounded-md flex items-center gap-2 text-sm font-bold hover:bg-[#1e3a8a]">
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