import { useState, useEffect, useMemo } from "react";
import { IntelRequest } from "../types";
import { intelRequestApi } from "../api/intelRequestApi";
import { decryptPayload, encryptPayload } from "@/lib/security/crypto";
import { isValidFile } from "@/lib/security/fileValidation";

export function useIntelRequests() {
  const [requests, setRequests] = useState<IntelRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const data = await intelRequestApi.getAll();
      const decryptedData = await Promise.all(
        data.map(async (req) => ({
          ...req,
          purpose: await decryptPayload(req.purpose),
          remarks: await decryptPayload(req.remarks),
        }))
      );
      setRequests(decryptedData);
    } catch (error) {
      showNotification((error as Error).message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const saveRequest = async (formData: FormData, purpose: string, remarks: string, isEdit: boolean) => {
    try {
      formData.set("purpose", await encryptPayload(purpose));
      formData.set("remarks", await encryptPayload(remarks));

      if (isEdit) {
        await intelRequestApi.update(formData);
        showNotification("Request updated successfully");
      } else {
        await intelRequestApi.create(formData);
        showNotification("Request created successfully");
      }
      await fetchRequests();
      return true;
    } catch (error) {
      showNotification((error as Error).message, "error");
      return false;
    }
  };

  const deleteRequest = async (id: string) => {
    if (!confirm("Are you sure you want to delete this request?")) return;
    try {
      await intelRequestApi.delete(id);
      showNotification("Request deleted successfully");
      await fetchRequests();
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
    const total = requests.length;
    const lowCount = requests.filter(r => r.urgency === "Low").length;
    const mediumCount = requests.filter(r => r.urgency === "Medium").length;
    const highCount = requests.filter(r => r.urgency === "High").length;
    const criticalCount = requests.filter(r => r.urgency === "Critical").length;
    
    const entityCounts: Record<string, number> = {};
    requests.forEach(r => r.entities?.forEach(ent => { entityCounts[ent] = (entityCounts[ent] || 0) + 1; }));
    const topEntity = Object.keys(entityCounts).length > 0 
      ? Object.keys(entityCounts).reduce((a, b) => entityCounts[a] > entityCounts[b] ? a : b) 
      : "N/A";

    const recentRecords = [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

    return { total, lowCount, mediumCount, highCount, criticalCount, topEntity, recentRecords };
  }, [requests]);

  return { requests, isLoading, notification, stats, saveRequest, deleteRequest, validateAndAddFile, showNotification, refresh: fetchRequests };
}