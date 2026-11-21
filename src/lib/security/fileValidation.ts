// SECURITY: Strict whitelist to prevent malicious file uploads
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "text/plain",
];

export const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.txt'];

export const isValidFile = (file: File): boolean => {
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  const isValidExt = ALLOWED_EXTENSIONS.includes(ext);
  const isValidMime = ALLOWED_MIME_TYPES.includes(file.type);
  return isValidExt && isValidMime;
};