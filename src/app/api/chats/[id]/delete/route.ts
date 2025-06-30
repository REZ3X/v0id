import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/utils/auth";
import ChatModel from "@/models/Chats";

export async function DELETE(
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

    await chatModel.deleteChat(chatId);

    return NextResponse.json({ message: "Chat deleted successfully" });
  } catch (error) {
    console.error("Delete chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
