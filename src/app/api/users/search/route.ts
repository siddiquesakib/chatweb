import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import dbConnect from "@/lib/db";
import User from "@/models/user";
import { searchUserSchema } from "@/lib/validations";
import { unauthorized, serverError } from "@/lib/utils/api";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) return unauthorized();

    const url = new URL(req.url);
    const raw = { q: url.searchParams.get("q") ?? "" };
    const parsed = searchUserSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const allowed = await checkRateLimit(`search:${session.user.id}`, 500);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    await dbConnect();

    const regex = new RegExp(parsed.data.q, "i");
    const users = await User.find({
      $and: [
        { _id: { $ne: session.user.id } },
        { $or: [{ name: regex }, { username: regex }] },
      ],
    })
      .select("name username image")
      .limit(20)
      .lean();

    return NextResponse.json({
      users: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        username: u.username,
        image: u.image,
      })),
    });
  } catch (error) {
    return serverError(error);
  }
}
