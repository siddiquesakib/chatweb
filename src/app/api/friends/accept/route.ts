import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import dbConnect from "@/lib/db";
import FriendRequest from "@/models/friend-request";
import Friendship from "@/models/friendship";
import Conversation from "@/models/conversation";
import User from "@/models/user";
import { triggerUserEvent } from "@/lib/pusher/server";
import { acceptFriendSchema } from "@/lib/validations";
import { sortIds, getLatestKey, unauthorized, serverError } from "@/lib/utils/api";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) return unauthorized();

    const raw = await req.json();
    const parsed = acceptFriendSchema.safeParse(raw);
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

    if (request.status !== "pending") {
      return NextResponse.json({ error: "Request is not pending" }, { status: 400 });
    }

    const [user1, user2] = sortIds(request.sender.toString(), request.receiver.toString());

    const existingFriendship = await Friendship.findOne({ user1, user2 });
    if (!existingFriendship) {
      await Friendship.create({ user1, user2 });
    }

    let conversationId: string;
    const existingConversation = await Conversation.findOne({
      participants: { $all: [user1, user2], $size: 2 },
    });

    if (existingConversation) {
      conversationId = existingConversation._id.toString();
    } else {
      const conversation = await Conversation.create({
        participants: [user1, user2],
        lastMessageAt: null,
      });
      conversationId = conversation._id.toString();
    }

    const [accepter, sender] = await Promise.all([
      User.findById(session.user.id).select("keys").lean(),
      User.findById(request.sender.toString()).select("keys").lean(),
    ]);

    const accepterKey = getLatestKey(accepter);
    const senderKey = getLatestKey(sender);

    request.status = "accepted";
    await request.save();

    try {
      await triggerUserEvent(request.sender.toString(), "friendship-accepted", {
        conversationId,
        friendId: session.user.id,
      });
    } catch (e) {
      console.error("Pusher event failed (non-fatal):", e);
    }

    return NextResponse.json({
      message: "Friend request accepted",
      friendId: request.sender.toString(),
      conversationId,
      partnerPublicKey: senderKey?.publicKey ?? null,
      partnerKeyVersion: senderKey?.keyVersion ?? null,
      myPublicKey: accepterKey?.publicKey ?? null,
      myKeyVersion: accepterKey?.keyVersion ?? null,
    });
  } catch (error) {
    return serverError(error);
  }
}
