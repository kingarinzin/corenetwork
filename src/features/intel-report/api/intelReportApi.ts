import { IntelReport } from "../types";

const BASE_URL = "/api/core-network/intel-reporting";

export const intelReportApi = {
  getAll: async (): Promise<IntelReport[]> => {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error("Failed to load reports");
    return res.json();
  },

  create: async (formData: FormData): Promise<void> => {
    const res = await fetch(BASE_URL, { method: "POST", body: formData });
    if (!res.ok) {
      // Extract the exact error from the backend response
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to create report (Status: ${res.status})`);
    }
  },

  update: async (formData: FormData): Promise<void> => {
    const res = await fetch(BASE_URL, { method: "PUT", body: formData });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update report (Status: ${res.status})`);
    }
  },

  delete: async (id: string): Promise<void> => {
    const res = await fetch(BASE_URL, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: id }),
    });
    if (!res.ok) throw new Error("Failed to delete report");
  },

  deleteFile: async (entryId: string, fileName: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/delete-file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId, fileName }),
    });
    if (!res.ok) throw new Error("Failed to delete file");
  },
};