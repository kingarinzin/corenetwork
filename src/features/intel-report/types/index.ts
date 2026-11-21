export type Attachment = { filename: string; classification: string };

export type IntelReport = {
  _id: string;
  entities: string[];
  classification: string;
  remarks: string;
  attachments?: Attachment[] | string[];
  submittedBy?: { name: string; department: string; division: string };
  createdAt: string;
  updatedAt: string;
};

export const entityOptions = [
  "Person", "Asset", "Report", "Case", "Intel Project", "Family Details",
  "Tax Payer", "Tax Document", "Revenue", "Travel Log", "Missing Person",
  "Beneficial Owner", "Remittance", "Address", "Telco", "Transaction Documents",
  "Security Clearance", "Credit Information", "Custome_Document", "Watch List"
];

export const classificationOptions = ["Confidential", "Secret", "Public"];