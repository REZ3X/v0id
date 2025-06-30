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

    const basicUsers = await userModel.countUsersByRole("basic");
    const premiumUsers = await userModel.countUsersByRole("premium");
    const devUsers = await userModel.countUsersByRole("dev");
    const totalUsers = basicUsers + premiumUsers + devUsers;

    return NextResponse.json({
      totalUsers,
      basicUsers,
      premiumUsers,
      devUsers,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
