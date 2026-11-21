import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import CoreNetwork from "@/models/CoreNetwork";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

// ==========================================
// SECURITY: Server-side Validation
// ==========================================
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.txt'];

const isValidFile = (fileName) => {
  const ext = path.extname(fileName).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
};

const sanitizeFileName = (fileName) => {
  const ext = path.extname(fileName).toLowerCase();
  const randomString = Math.random().toString(36).substring(2, 15);
  return `${Date.now()}-${randomString}${ext}`;
};

// ==========================================
// GET: Fetch all reports (This was missing!)
// ==========================================
export async function GET() {
  await dbConnect();
  const entries = await CoreNetwork.find().sort({ createdAt: -1 });
  return NextResponse.json(entries);
}

// ==========================================
// POST: Create a new report
// ==========================================
export async function POST(req) {
  try {
    await dbConnect();
    const formData = await req.formData();

    const entitiesRaw = formData.get("entities");
    const entities = entitiesRaw ? JSON.parse(entitiesRaw) : [];
    const classification = formData.get("classification");
    const remarks = formData.get("remarks"); 
    const submittedByName = formData.get("submittedByName");
    const submittedByDepartment = formData.get("submittedByDepartment");
    const submittedByDivision = formData.get("submittedByDivision");

    if (!entities.length || !classification) {
      return NextResponse.json(
        { error: "At least one Entity and Classification are required" },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public/uploads/core-network");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const newAttachments = [];
    const newAttachmentsMetaRaw = formData.get("newAttachments");
    const newAttachmentsMeta = newAttachmentsMetaRaw ? JSON.parse(newAttachmentsMetaRaw) : [];

    for (let i = 0; i < newAttachmentsMeta.length; i++) {
      const file = formData.get(`attachment_${i}`);
      if (file && file instanceof File) {
        
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

    const newEntry = await CoreNetwork.create({
      entities,
      classification,
      remarks: remarks || "", 
      attachments: newAttachments,
      status: "Submitted",
      submittedBy: {
        name: submittedByName || "Unknown",
        department: submittedByDepartment || "",
        division: submittedByDivision || "",
      },
    });

    return NextResponse.json(newEntry, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json(
      { error: "Failed to create entry" },
      { status: 500 }
    );
  }
}

// ==========================================
// PUT: Update a report
// ==========================================
export async function PUT(req) {
  try {
    await dbConnect();
    const formData = await req.formData();

    const id = formData.get("_id");
    const entitiesRaw = formData.get("entities");
    const entities = entitiesRaw ? JSON.parse(entitiesRaw) : [];
    const classification = formData.get("classification");
    const remarks = formData.get("remarks");
    const existingAttachmentsRaw = formData.get("existingAttachments");
    
    const existingAttachments = existingAttachmentsRaw
      ? JSON.parse(existingAttachmentsRaw)
      : [];

    if (!id || !entities.length || !classification) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public/uploads/core-network");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const newAttachments = [];
    const newAttachmentsMetaRaw = formData.get("newAttachments");
    const newAttachmentsMeta = newAttachmentsMetaRaw ? JSON.parse(newAttachmentsMetaRaw) : [];

    for (let i = 0; i < newAttachmentsMeta.length; i++) {
      const file = formData.get(`attachment_${i}`);
      if (file && file instanceof File) {
        
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

    const updated = await CoreNetwork.findByIdAndUpdate(
      id,
      {
        entities,
        classification,
        remarks, 
        attachments: allAttachments,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update entry" },
      { status: 500 }
    );
  }
}

// ==========================================
// DELETE: Delete a report
// ==========================================
export async function DELETE(req) {
  try {
    await dbConnect();
    const { _id } = await req.json();
    if (!_id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const entry = await CoreNetwork.findById(_id);
    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const uploadDir = path.join(process.cwd(), "public/uploads/core-network");
    for (const att of entry.attachments) {
      try {
        const filePath = path.join(uploadDir, att.filename);
        if (filePath.startsWith(uploadDir)) {
            await unlink(filePath);
        }
      } catch (err) {
        console.error(`Failed to delete file ${att.filename}:`, err);
      }
    }

    await CoreNetwork.findByIdAndDelete(_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}