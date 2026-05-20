import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import dbConnect from "@/lib/db";
import FriendRequest from "@/models/friend-request";
import { unauthorized, serverError } from "@/lib/utils/api";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) return unauthorized();

    await dbConnect();

    const requests = await FriendRequest.find({
      receiver: session.user.id,
      status: "pending",
    })
      .populate("sender", "name username image")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ requests });
  } catch (error) {
    return serverError(error);
  }
}
