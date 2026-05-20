import dbConnect from "@/lib/db";
import RateLimit from "@/models/rate-limit";

const WINDOW = 1000;

export async function checkRateLimit(key: string, windowMs = WINDOW): Promise<boolean> {
  try {
    await dbConnect();
    const prev = await RateLimit.findOneAndUpdate(
      { key },
      { $set: { timestamp: new Date() } },
      { upsert: true, returnDocument: "before" },
    );
    if (prev && Date.now() - prev.timestamp.getTime() < windowMs) {
      return false;
    }
    return true;
  } catch {
    return true;
  }
}
