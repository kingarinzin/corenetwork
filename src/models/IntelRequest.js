import mongoose from "mongoose";

const AttachmentSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  classification: { type: String, required: true, enum: ["Confidential", "Secret", "Public"] }
});

const IntelRequestSchema = new mongoose.Schema(
  {
    entities: [{ type: String, required: true }],
    purpose: { type: String, required: true },
    urgency: { type: String, required: true, enum: ["Low", "Medium", "High", "Critical"] },
    remarks: { type: String, default: "" },
    attachments: [AttachmentSchema],
    requestingOfficer: {
      name: { type: String, required: true },
      department: { type: String, default: "" },
      division: { type: String, default: "" },
    },
    requestingDate: { type: Date, default: null },
    status: { type: String, default: "Pending" },
  },
  { timestamps: true }
);

export default mongoose.models.IntelRequest || mongoose.model("IntelRequest", IntelRequestSchema);