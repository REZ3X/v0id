import { NextRequest, NextResponse } from "next/server";
import {
  verifyToken,
  hashPassword,
  validatePassword,
  comparePassword,
  validateEmail,
} from "@/utils/auth";
import UserModel from "@/models/User";

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { name, email, currentPassword, newPassword } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const userModel = new UserModel();
    await userModel.connect();

    const user = await userModel.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (email !== user.email) {
      if (await userModel.checkEmailExists(email, decoded.id)) {
        return NextResponse.json(
          { error: "Email is already taken" },
          { status: 400 }
        );
      }
    }

    const updateData: Partial<any> = {
      name,
      email,
    };

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required to set new password" },
          { status: 400 }
        );
      }

      const isCurrentPasswordValid = await comparePassword(
        currentPassword,
        user.password
      );
      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }

      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return NextResponse.json(
          { error: passwordValidation.message },
          { status: 400 }
        );
      }

      updateData.password = await hashPassword(newPassword);
    }

    await userModel.updateById(decoded.id, updateData);

    return NextResponse.json(
      { message: "Profile updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
