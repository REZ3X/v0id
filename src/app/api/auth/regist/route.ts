import { NextRequest, NextResponse } from "next/server";
import UserModel, { User } from "@/models/User";
import {
  hashPassword,
  validatePassword,
  validateAge,
  validateEmail,
  validateUsername,
} from "@/utils/auth";

export async function POST(request: NextRequest) {
  try {
    const { name, username, email, password, birthdate } = await request.json();

    if (!name || !username || !email || !password || !birthdate) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      return NextResponse.json(
        { error: usernameValidation.message },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      );
    }

    const birthdateObj = new Date(birthdate);
    if (!validateAge(birthdateObj)) {
      return NextResponse.json(
        { error: "You must be at least 18 years old to register" },
        { status: 400 }
      );
    }

    const userModel = new UserModel();
    await userModel.connect();

    if (await userModel.checkEmailExists(email)) {
      return NextResponse.json(
        { error: "Email is already registered" },
        { status: 400 }
      );
    }

    if (await userModel.checkUsernameExists(username)) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const newUser: Omit<User, "_id"> = {
      name,
      username,
      email,
      password: hashedPassword,
      birthdate: birthdateObj,
      role: "basic",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const userId = await userModel.create(newUser);

    return NextResponse.json(
      { message: "User registered successfully", userId: userId.toString() },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
