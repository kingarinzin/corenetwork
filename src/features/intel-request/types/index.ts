export type Attachment = { filename: string; classification: string };

export type IntelRequest = {
  _id: string;
  entities: string[];
  purpose: string;
  urgency: string;
  remarks: string;
  requestingOfficer: { name: string; department: string; division: string };
  requestingDate: string;
  attachments?: Attachment[] | string[];
  createdAt: string;
  updatedAt: string;
};

export const entityOptions = [
  "Person", "Asset", "Report", "Case", "Intel Project", "Family Details",
  "Tax Payer", "Tax Document", "Revenue", "Travel Log", "Missing Person",
  "Beneficial Owner", "Remittance", "Address", "Telco", "Transaction Documents",
  "Security Clearance", "Credit Information", "Custome_Document", "Watch List"
];

export const urgencyOptions = ["Low", "Medium", "High", "Critical"];
export const classificationOptions = ["Confidential", "Secret", "Public"];