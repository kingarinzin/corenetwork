import { IntelRequest } from "../types";

const BASE_URL = "/api/core-network/intel-requesting";

export const intelRequestApi = {
  getAll: async (): Promise<IntelRequest[]> => {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error("Failed to load requests");
    return res.json();
  },

  create: async (formData: FormData): Promise<void> => {
    const res = await fetch(BASE_URL, { method: "POST", body: formData });
    if (!res.ok) throw new Error("Failed to create request");
  },

  update: async (formData: FormData): Promise<void> => {
    const res = await fetch(BASE_URL, { method: "PUT", body: formData });
    if (!res.ok) throw new Error("Failed to update request");
  },

  delete: async (id: string): Promise<void> => {
    const res = await fetch(BASE_URL, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: id }),
    });
    if (!res.ok) throw new Error("Failed to delete request");
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