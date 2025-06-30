import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/utils/auth";
import UserModel from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userData = verifyToken(token);
    if (!userData) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (userData.role !== "dev") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const userModel = new UserModel();
    await userModel.connect();
    const users = await userModel.getAllUsers();

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
