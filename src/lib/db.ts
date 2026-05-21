import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  indexesFixed: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null, indexesFixed: false };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

async function fixConversationIndexes(): Promise<void> {
  try {
    const db = mongoose.connection.db;
    if (!db) return;
    const indexes = await db.collection("conversations").indexes();
    const bad = indexes.find(
      (i: { name?: string; unique?: boolean }) =>
        i.name === "participants_1" && i.unique === true,
    );
    if (bad) {
      await db.collection("conversations").dropIndex("participants_1");
      await db.collection("conversations").createIndex({ participants: 1 });
    }
  } catch (e) {
    console.warn("Index fix warning (non-fatal):", e);
  }
}

async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn && cached.indexesFixed) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI!, {
      bufferCommands: false,
    });
  }

  try {
    cached.conn = await cached.promise;
    if (!cached.indexesFixed) {
      await fixConversationIndexes();
      cached.indexesFixed = true;
    }
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default dbConnect;
