import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/utils/auth";
import ChatModel from "@/models/Chats";
import { generateChatResponse, generateChatTitle } from "@/lib/geminiapi";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userData = verifyToken(token);
    if (!userData) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { title, firstMessage } = await request.json();

    let chatTitle = title;

    if (firstMessage && typeof firstMessage === "string") {
      try {
        chatTitle = await generateChatTitle(firstMessage);
      } catch (error) {
        console.error("Failed to generate title, using fallback:", error);
        chatTitle =
          title ||
          (firstMessage.length > 50
            ? firstMessage.substring(0, 47) + "..."
            : firstMessage.split(".")[0] || firstMessage);
      }
    }

    if (!chatTitle || typeof chatTitle !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const chatModel = new ChatModel();

    const chatCount = await chatModel.countChatsByUserId(userData.id);

    if (userData.role === "basic" && chatCount >= 3) {
      return NextResponse.json(
        {
          error:
            "You've reached your chat limit. Upgrade to premium for more chats.",
        },
        { status: 403 }
      );
    }

    if (userData.role === "premium" && chatCount >= 10) {
      return NextResponse.json(
        {
          error:
            "You've reached your chat limit. Upgrade to developer for unlimited chats.",
        },
        { status: 403 }
      );
    }

    const chatId = await chatModel.createChat(userData.id, chatTitle);

    if (firstMessage && typeof firstMessage === "string") {
      await chatModel.addMessage(chatId, firstMessage, "user");

      const response = await generateChatResponse(firstMessage, [], []);

      await chatModel.addMessage(chatId, response, "assistant");

      return NextResponse.json({
        message: "Chat created successfully",
        chatId: chatId,
        response: response,
        title: chatTitle,
      });
    }

    return NextResponse.json({
      message: "Chat created successfully",
      chatId: chatId,
      title: chatTitle,
    });
  } catch (error) {
    console.error("Create chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    const chatModel = new ChatModel();
    const chats = await chatModel.getChatsByUserId(userData.id);

    return NextResponse.json({ chats });
  } catch (error) {
    console.error("Get chats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
