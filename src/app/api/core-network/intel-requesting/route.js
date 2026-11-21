import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import IntelRequest from "@/models/IntelRequest";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

// SECURITY: Server-side validation (Never trust the frontend)
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.txt'];

const isValidFile = (fileName) => {
  const ext = path.extname(fileName).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
};

// SECURITY: Prevents Path Traversal by ignoring user filename
const sanitizeFileName = (fileName) => {
  const ext = path.extname(fileName).toLowerCase();
  const randomString = Math.random().toString(36).substring(2, 15);
  return `${Date.now()}-${randomString}${ext}`;
};

export async function GET() {
  await dbConnect();
  const requests = await IntelRequest.find().sort({ createdAt: -1 });
  return NextResponse.json(requests);
}

export async function POST(req) {
  try {
    await dbConnect();
    const formData = await req.formData();

    const entities = JSON.parse(formData.get("entities") || "[]");
    // SECURITY: These are CIPHERTEXT strings. The server does not decrypt them.
    const purpose = formData.get("purpose"); 
    const urgency = formData.get("urgency");
    const remarks = formData.get("remarks") || "";
    const requestingOfficer = formData.get("requestingOfficer");
    const requestingDepartment = formData.get("requestingDepartment") || "";
    const requestingDivision = formData.get("requestingDivision") || "";
    const requestingDate = formData.get("requestingDate") || null;

    if (!entities.length || !purpose || !urgency || !requestingOfficer) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public/uploads/core-network");
    if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });

    const newAttachments = [];
    const newAttachmentsMeta = JSON.parse(formData.get("newAttachments") || "[]");
    for (let i = 0; i < newAttachmentsMeta.length; i++) {
      const file = formData.get(`attachment_${i}`);
      if (file instanceof File) {
        // SECURITY CHECK
        if (!isValidFile(file.name)) {
          return NextResponse.json({ error: `Invalid file type: ${file.name}` }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Use sanitized name
        const safeName = sanitizeFileName(file.name);
        const filePath = path.join(uploadDir, safeName);
        
        await writeFile(filePath, buffer);
        newAttachments.push({
          filename: safeName,
          classification: newAttachmentsMeta[i].classification
        });
      }
    }

    const newRequest = await IntelRequest.create({
      entities,
      purpose, // Stores ciphertext
      urgency,
      remarks, // Stores ciphertext
      attachments: newAttachments,
      requestingOfficer: {
        name: requestingOfficer,
        department: requestingDepartment,
        division: requestingDivision,
      },
      requestingDate: requestingDate ? new Date(requestingDate) : null,
      status: "Pending",
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await dbConnect();
    const formData = await req.formData();

    const id = formData.get("_id");
    const entities = JSON.parse(formData.get("entities") || "[]");
    // SECURITY: These are CIPHERTEXT strings.
    const purpose = formData.get("purpose");
    const urgency = formData.get("urgency");
    const remarks = formData.get("remarks") || "";
    const requestingOfficer = formData.get("requestingOfficer");
    const requestingDepartment = formData.get("requestingDepartment") || "";
    const requestingDivision = formData.get("requestingDivision") || "";
    const requestingDate = formData.get("requestingDate") || null;
    const existingAttachments = JSON.parse(formData.get("existingAttachments") || "[]");

    if (!id || !entities.length || !purpose || !urgency || !requestingOfficer) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public/uploads/core-network");
    if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });

    const newAttachments = [];
    const newAttachmentsMeta = JSON.parse(formData.get("newAttachments") || "[]");
    for (let i = 0; i < newAttachmentsMeta.length; i++) {
      const file = formData.get(`attachment_${i}`);
      if (file instanceof File) {
        if (!isValidFile(file.name)) {
          return NextResponse.json({ error: `Invalid file type: ${file.name}` }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const safeName = sanitizeFileName(file.name);
        const filePath = path.join(uploadDir, safeName);
        
        await writeFile(filePath, buffer);
        newAttachments.push({
          filename: safeName,
          classification: newAttachmentsMeta[i].classification
        });
      }
    }

    const allAttachments = [...existingAttachments, ...newAttachments];

    const updated = await IntelRequest.findByIdAndUpdate(
      id,
      {
        entities,
        purpose,
        urgency,
        remarks,
        attachments: allAttachments,
        requestingOfficer: {
          name: requestingOfficer,
          department: requestingDepartment,
          division: requestingDivision,
        },
        requestingDate: requestingDate ? new Date(requestingDate) : null,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await dbConnect();
    const { _id } = await req.json();
    if (!_id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const request = await IntelRequest.findById(_id);
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const uploadDir = path.join(process.cwd(), "public/uploads/core-network");
    for (const att of request.attachments) {
      try {
        const filePath = path.join(uploadDir, att.filename);
        // SECURITY: Ensure we only delete files within our specific upload folder
        if (filePath.startsWith(uploadDir)) {
            await unlink(filePath);
        }
      } catch (err) { console.error(err); }
    }
    await IntelRequest.findByIdAndDelete(_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}