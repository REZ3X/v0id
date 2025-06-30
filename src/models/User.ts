import { Db, Collection, ObjectId } from "mongodb";
import { connectDB } from "@/lib/mongodb";

export type UserRole = "dev" | "premium" | "basic";

export interface User {
  _id?: ObjectId;
  name: string;
  username: string;
  email: string;
  password: string;
  birthdate: Date;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSession {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
}

interface EmailQuery {
  email: string;
  _id?: { $ne: ObjectId };
}

class UserModel {
  private db: Db | null = null;
  private collection: Collection<User> | null = null;

  async connect() {
    if (!this.db) {
      this.db = await connectDB();
      this.collection = this.db.collection<User>("users");
    }
  }

  private getCollection(): Collection<User> {
    if (!this.collection) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.collection;
  }

  async findByEmailOrUsername(identifier: string): Promise<User | null> {
    await this.connect();
    return await this.getCollection().findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });
  }

  async findById(id: string): Promise<User | null> {
    await this.connect();
    return await this.getCollection().findOne({ _id: new ObjectId(id) });
  }

  async findByIdWithoutPassword(
    id: string
  ): Promise<Omit<User, "password"> | null> {
    await this.connect();
    return (await this.getCollection().findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    )) as Omit<User, "password"> | null;
  }

  async create(userData: Omit<User, "_id">): Promise<ObjectId> {
    await this.connect();
    const result = await this.getCollection().insertOne(userData);
    return result.insertedId;
  }

  async updateById(id: string, updateData: Partial<User>): Promise<void> {
    await this.connect();
    await this.getCollection().updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updateData, updatedAt: new Date() } }
    );
  }

  async deleteById(id: string): Promise<void> {
    await this.connect();
    await this.getCollection().deleteOne({ _id: new ObjectId(id) });
  }

  async checkEmailExists(email: string, excludeId?: string): Promise<boolean> {
    await this.connect();
    const query: EmailQuery = { email };
    if (excludeId) {
      query._id = { $ne: new ObjectId(excludeId) };
    }
    const user = await this.getCollection().findOne(query);
    return !!user;
  }

  async checkUsernameExists(username: string): Promise<boolean> {
    await this.connect();
    const user = await this.getCollection().findOne({ username });
    return !!user;
  }

  async findByUsername(username: string): Promise<User | null> {
    await this.connect();
    return await this.getCollection().findOne({ username });
  }

  async getAllUsers(): Promise<User[]> {
    await this.connect();
    return await this.getCollection()
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async countUsersByRole(role: UserRole): Promise<number> {
    await this.connect();
    return await this.getCollection().countDocuments({ role });
  }
}

export default UserModel;
