import { useState, useEffect, useMemo } from "react";
import { IntelReport } from "../types";
import { intelReportApi } from "../api/intelReportApi";
import { decryptPayload, encryptPayload } from "@/lib/security/crypto";
import { isValidFile } from "@/lib/security/fileValidation";

export function useIntelReports() {
  const [reports, setReports] = useState<IntelReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const data = await intelReportApi.getAll();
      // SECURITY: Decrypt remarks on load
      const decryptedData = await Promise.all(
        data.map(async (entry) => ({
          ...entry,
          remarks: await decryptPayload(entry.remarks),
        }))
      );
      setReports(decryptedData);
    } catch (error) {
      showNotification((error as Error).message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const saveReport = async (formData: FormData, remarks: string, isEdit: boolean) => {
    try {
      // SECURITY: Encrypt before sending to API
      formData.set("remarks", await encryptPayload(remarks));

      if (isEdit) {
        await intelReportApi.update(formData);
        showNotification("Report updated successfully");
      } else {
        await intelReportApi.create(formData);
        showNotification("Report created successfully");
      }
      await fetchReports();
      return true;
    } catch (error) {
      showNotification((error as Error).message, "error");
      return false;
    }
  };

  const deleteReport = async (id: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;
    try {
      await intelReportApi.delete(id);
      showNotification("Report deleted successfully");
      await fetchReports();
    } catch (error) {
      showNotification((error as Error).message, "error");
    }
  };

  const validateAndAddFile = (file: File): boolean => {
    if (!isValidFile(file)) {
      showNotification("Invalid file type. Allowed: PDF, DOC, XLS, Images, TXT", "error");
      return false;
    }
    return true;
  };

  const stats = useMemo(() => {
    const total = reports.length;
    const confidentialCount = reports.filter(r => r.classification === "Confidential").length;
    const secretCount = reports.filter(r => r.classification === "Secret").length;
    const publicCount = reports.filter(r => r.classification === "Public").length;

    const entityCounts: Record<string, number> = {};
    reports.forEach(r => r.entities?.forEach(ent => { entityCounts[ent] = (entityCounts[ent] || 0) + 1; }));
    const topEntity = Object.keys(entityCounts).length > 0 
      ? Object.keys(entityCounts).reduce((a, b) => entityCounts[a] > entityCounts[b] ? a : b) 
      : "N/A";

    return { total, confidentialCount, secretCount, publicCount, topEntity };
  }, [reports]);

  return { reports, isLoading, notification, stats, saveReport, deleteReport, validateAndAddFile, showNotification, refresh: fetchReports };
}