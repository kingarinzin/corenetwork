import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyAdmin } from "@/lib/admin-auth";
import { ObjectId } from "mongodb";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await verifyAdmin(req);
    if (!adminCheck.valid) {
      return NextResponse.json(
        { error: adminCheck.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const client = await clientPromise;
    const db = client.db("referral_db");

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const user = await db.collection("users").findOne({ _id: new ObjectId(id) });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const departments = await db.collection("departments").find({}).toArray();
    const divisions = await db.collection("divisions").find({}).toArray();
    const agencies = await db.collection("agencies").find({}).toArray();

    const department = departments.find(
      (d) => d._id.toString() === (user.departmentId || "").toString()
    );
    const division = divisions.find(
      (d) => d._id.toString() === (user.divisionId || "").toString()
    );
    const agency = agencies.find(
      (a) => a._id.toString() === (user.agencyId || "").toString()
    );

    console.log("User divisionId:", user.divisionId);
    console.log("Found division:", division);

    const mappedUser = {
      _id: user._id.toString(),
      name: user.name || "",
      cid: user.cid || "",
      designation: user.designation || "",
      phone: user.phone || "",
      email: user.email || "",
      agencyId: user.agencyId?.toString() || "",
      agencyName: agency?.name || "",
      departmentId: user.departmentId?.toString() || "",
      departmentName: department?.name || "",
      divisionId: user.divisionId?.toString() || "",
      divisionName: division?.name || "",
      role: user.role || "Officer",
      isActive: user.isActive !== undefined ? user.isActive : true,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
    };

    return NextResponse.json({ user: mappedUser });
  } catch (error: any) {
    console.error("GET /api/admin/all-users/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await verifyAdmin(req);
    if (!adminCheck.valid) {
      return NextResponse.json(
        { error: adminCheck.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const client = await clientPromise;
    const db = client.db("referral_db");
    const body = await req.json();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    console.log("Updating user with data:", body);

    const updates: Record<string, any> = {
      name: body.name,
      cid: body.cid,
      designation: body.designation,
      phone: body.phone,
      email: body.email,
      role: body.role,
      isActive: body.isActive,
      updatedAt: new Date(),
    };

    if (body.agencyId && body.agencyId !== "") {
      if (ObjectId.isValid(body.agencyId)) {
        updates.agencyId = new ObjectId(body.agencyId);
      }
    } else {
      updates.agencyId = null;
    }

    if (body.departmentId && body.departmentId !== "") {
      if (ObjectId.isValid(body.departmentId)) {
        updates.departmentId = new ObjectId(body.departmentId);
      }
    } else {
      updates.departmentId = null;
    }

    if (body.divisionId && body.divisionId !== "") {
      if (ObjectId.isValid(body.divisionId)) {
        updates.divisionId = new ObjectId(body.divisionId);
      }
    } else {
      updates.divisionId = null;
    }

    console.log("Final updates:", updates);

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "User updated successfully" });
  } catch (error: any) {
    console.error("PUT /api/admin/all-users/[id] error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}