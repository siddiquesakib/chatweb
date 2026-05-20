import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import dbConnect from "@/lib/db";
import FriendRequest from "@/models/friend-request";
import { rejectFriendSchema } from "@/lib/validations";
import { unauthorized, serverError } from "@/lib/utils/api";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) return unauthorized();

    const raw = await req.json();
    const parsed = rejectFriendSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { requestId } = parsed.data;

    await dbConnect();

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (request.receiver.toString() !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    request.status = "rejected";
    await request.save();

    return NextResponse.json({ message: "Friend request rejected" });
  } catch (error) {
    return serverError(error);
  }
}
