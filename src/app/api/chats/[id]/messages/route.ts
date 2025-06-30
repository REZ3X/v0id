import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/utils/auth";
import ChatModel from "@/models/Chats";
import { generateChatResponse, extractMemories } from "@/lib/geminiapi";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatId } = await params;

    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userData = verifyToken(token);
    if (!userData) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 }
      );
    }

    if (message.length > 4000) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    const chatModel = new ChatModel();
    const chat = await chatModel.getChat(chatId);

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (chat.userId.toString() !== userData.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (userData.role === "basic") {
      const messageCount = await chatModel.countMessages(chatId);
      if (messageCount >= 50) {
        return NextResponse.json(
          {
            error:
              "Message limit reached for this chat. Upgrade to premium for unlimited messages.",
          },
          { status: 403 }
        );
      }
    }

    await chatModel.addMessage(chatId, message, "user");

    const chatHistory = await chatModel.getMessages(chatId);
    const recentHistory = chatHistory.slice(-20);
    const memories = await chatModel.getMemory(chatId);

    const formattedHistory = recentHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const response = await generateChatResponse(
      message,
      formattedHistory,
      memories
    );

    await chatModel.addMessage(chatId, response, "assistant");

    if (recentHistory.length % 8 === 0 && recentHistory.length > 0) {
      const newMemories = await extractMemories(formattedHistory);

      for (const memory of newMemories) {
        if (
          memory &&
          memory.length > 10 &&
          !memories.some((m) => m.includes(memory.slice(0, 20)))
        ) {
          await chatModel.addMemory(chatId, memory);
        }
      }
    }

    return NextResponse.json({
      message: "Message sent successfully",
      response: response,
    });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatId } = await params;

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

    const messages = chat.messages || [];
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}