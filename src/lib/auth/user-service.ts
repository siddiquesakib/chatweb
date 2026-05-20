import dbConnect from "@/lib/db";
import User from "@/models/user";

const MONGO_DUPLICATE_KEY = 11000;

function randomSuffix(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function generateUsername(email: string): string {
  const prefix = email.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "") || "user";
  return `${prefix}_${randomSuffix()}`;
}

export async function getUserByEmail(email: string) {
  await dbConnect();
  return User.findOne({ email });
}

export async function getUserById(id: string) {
  await dbConnect();
  return User.findById(id);
}

export async function createUser(data: {
  name: string;
  email: string;
  image: string;
  provider: string;
  googleId: string;
}) {
  await dbConnect();

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await User.create({
        ...data,
        username: generateUsername(data.email),
        lastActiveAt: new Date(),
      });
    } catch (error: unknown) {
      const err = error as { code?: number };
      if (err.code === MONGO_DUPLICATE_KEY && attempt < 2) {
        continue;
      }
      throw error;
    }
  }
}

export async function updateUser(
  id: string,
  data: Partial<{
    name: string;
    image: string;
    username: string;
  }>,
) {
  await dbConnect();
  return User.findByIdAndUpdate(id, { $set: data }, { new: true });
}

export async function updateLastActive(id: string) {
  await dbConnect();
  return User.findByIdAndUpdate(id, { $set: { lastActiveAt: new Date() } });
}
