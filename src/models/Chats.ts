import { Db, Collection, ObjectId } from "mongodb";
import { connectDB } from "@/lib/mongodb";

export interface Message {
  _id?: ObjectId;
  content: string;
  role: "user" | "assistant";
  createdAt: Date;
}

export interface Chat {
  _id?: ObjectId;
  userId: ObjectId;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
  memory: string[];
}

class ChatModel {
  private db: Db | null = null;
  private collection: Collection<Chat> | null = null;

  async connect() {
    if (!this.db) {
      this.db = await connectDB();
      this.collection = this.db.collection<Chat>("chats");
    }
  }

  private getCollection(): Collection<Chat> {
    if (!this.collection) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.collection;
  }

  async createChat(
    userId: string,
    title: string = "New Chat"
  ): Promise<string> {
    await this.connect();
    const newChat: Omit<Chat, "_id"> = {
      userId: new ObjectId(userId),
      title,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
      memory: [],
    };

    const result = await this.getCollection().insertOne(newChat);
    return result.insertedId.toString();
  }

  async getChat(chatId: string): Promise<Chat | null> {
    await this.connect();
    return await this.getCollection().findOne({ _id: new ObjectId(chatId) });
  }

  async getChatsByUserId(userId: string): Promise<Chat[]> {
    await this.connect();
    return await this.getCollection()
      .find({ userId: new ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .toArray();
  }

  async countChatsByUserId(userId: string): Promise<number> {
    try {
      await this.connect();
      const count = await this.getCollection().countDocuments({
        userId: new ObjectId(userId),
      });
      return count;
    } catch (error) {
      console.error("Error counting chats:", error);
      throw error;
    }
  }

  async addMessage(
    chatId: string,
    content: string,
    role: "user" | "assistant"
  ): Promise<void> {
    await this.connect();
    const message: Message = {
      content,
      role,
      createdAt: new Date(),
    };

    await this.getCollection().updateOne(
      { _id: new ObjectId(chatId) },
      {
        $push: { messages: message },
        $set: { updatedAt: new Date() },
      }
    );
  }

  async countMessages(chatId: string): Promise<number> {
    await this.connect();
    const chat = await this.getCollection().findOne(
      { _id: new ObjectId(chatId) },
      { projection: { messages: 1 } }
    );
    return chat?.messages?.length || 0;
  }

  async updateChatTitle(chatId: string, title: string): Promise<void> {
    await this.connect();
    await this.getCollection().updateOne(
      { _id: new ObjectId(chatId) },
      { $set: { title, updatedAt: new Date() } }
    );
  }

  async deleteChat(chatId: string): Promise<void> {
    await this.connect();
    await this.getCollection().deleteOne({ _id: new ObjectId(chatId) });
  }

  async getMessages(chatId: string): Promise<Message[]> {
    await this.connect();
    const chat = await this.getCollection().findOne(
      { _id: new ObjectId(chatId) },
      { projection: { messages: 1 } }
    );
    return chat?.messages || [];
  }

  async addMemory(chatId: string, memory: string): Promise<void> {
    await this.connect();
    await this.getCollection().updateOne(
      { _id: new ObjectId(chatId) },
      {
        $push: { memory: memory },
        $set: { updatedAt: new Date() },
      }
    );
  }

  async getMemory(chatId: string): Promise<string[]> {
    await this.connect();
    const chat = await this.getCollection().findOne(
      { _id: new ObjectId(chatId) },
      { projection: { memory: 1 } }
    );
    return chat?.memory || [];
  }
}

export default ChatModel;
