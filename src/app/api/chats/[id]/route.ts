import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/utils/auth";
import ChatModel from "@/models/Chats";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chatId = params.id;

    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userData = verifyToken(token);
    if (!userData) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const chatModel = new ChatModel();
    const chat = await chatModel.getChat(chatId);

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (chat.userId.toString() !== userData.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ chat });
  } catch (error) {
    console.error("Get chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chatId = params.id;

    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userData = verifyToken(token);
    if (!userData) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { title } = await request.json();

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Valid title is required" },
        { status: 400 }
      );
    }

    const chatModel = new ChatModel();
    const chat = await chatModel.getChat(chatId);

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (chat.userId.toString() !== userData.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await chatModel.updateChatTitle(chatId, title);

    return NextResponse.json({ message: "Chat updated successfully" });
  } catch (error) {
    console.error("Update chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
