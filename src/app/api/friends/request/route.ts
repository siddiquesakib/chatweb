import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import dbConnect from "@/lib/db";
import FriendRequest from "@/models/friend-request";
import User from "@/models/user";
import { friendRequestSchema } from "@/lib/validations";
import { unauthorized, serverError } from "@/lib/utils/api";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) return unauthorized();

    const raw = await req.json();
    const parsed = friendRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const allowed = await checkRateLimit(`fr:${session.user.id}`);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    await dbConnect();

    const targetUser = await User.findById(parsed.data.receiverId);

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser._id.toString() === session.user.id) {
      return NextResponse.json({ error: "Cannot send request to yourself" }, { status: 400 });
    }

    const existing = await FriendRequest.findOne({
      $or: [
        { sender: session.user.id, receiver: targetUser._id.toString() },
        { sender: targetUser._id.toString(), receiver: session.user.id },
      ],
      status: "pending",
    });

    if (existing) {
      return NextResponse.json({ error: "Request already pending" }, { status: 409 });
    }

    await FriendRequest.create({
      sender: session.user.id,
      receiver: targetUser._id.toString(),
      status: "pending",
    });

    return NextResponse.json({ message: "Friend request sent" }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
