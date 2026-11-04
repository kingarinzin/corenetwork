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

    const entry = await CoreNetwork.findById(entryId);
    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // Filter by filename property
    entry.attachments = entry.attachments.filter((att) => att.filename !== fileName);
    await entry.save();

    const filePath = path.join(
      process.cwd(),
      "public/uploads/core-network",
      fileName
    );
    try {
      await unlink(filePath);
    } catch (err) {
      console.error("File delete error:", err);
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