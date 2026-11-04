import mongoose from "mongoose";

const AttachmentSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  classification: {
    type: String,
    required: true,
    enum: ["Confidential", "Secret", "Public"],
  },
});

const CoreNetworkSchema = new mongoose.Schema(
  {
    entities: [{ type: String, required: true }],
    classification: {
      type: String,
      required: true,
      enum: ["Confidential", "Secret", "Public"],
    },
    remarks: { type: String, default: "" },
    attachments: [AttachmentSchema],
    status: { type: String, default: "Submitted" },
    submittedBy: {
      name: { type: String, required: true },
      department: { type: String, default: "" },
      division: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export default mongoose.models.CoreNetwork ||
  mongoose.model("CoreNetwork", CoreNetworkSchema);