import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import CoreNetwork from "@/models/CoreNetwork";
import path from "path";
import { unlink } from "fs/promises";

export async function POST(req) {
  try {
    await dbConnect();
    const { entryId, fileName } = await req.json();

    if (!entryId || !fileName) {
      return NextResponse.json(
        { error: "Missing entryId or fileName" },
        { status: 400 }
      );
    }

    // SECURITY FIX 1: Prevent Path Traversal
    // A valid filename should never contain slashes. 
    // If it does, an attacker is trying to navigate the server's file system.
    if (fileName.includes("/") || fileName.includes("\\")) {
      return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
    }

    const entry = await CoreNetwork.findById(entryId);
    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // Filter by filename property to remove from database
    entry.attachments = entry.attachments.filter((att) => att.filename !== fileName);
    await entry.save();

    // SECURITY FIX 2: Ensure the path stays within the upload directory
    const uploadDir = path.join(process.cwd(), "public/uploads/core-network");
    const filePath = path.join(uploadDir, fileName);

    // Double-check that the resolved path starts with the upload directory
    if (filePath.startsWith(uploadDir)) {
      try {
        await unlink(filePath);
      } catch (err) {
        console.error("File delete error:", err);
        // We don't return an error here because the database record is already updated.
        // The file might have been missing on disk, but the cleanup is effectively done.
      }
    } else {
      // This shouldn't happen due to Fix 1, but it's a good defense-in-depth measure.
      return NextResponse.json({ error: "Security violation: Invalid path" }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete file error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  } 
}