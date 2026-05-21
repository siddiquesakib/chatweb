import { NextResponse } from "next/server";
import mongoose from "mongoose";
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
  console.log("=== FRIEND ACCEPT START ===");
  try {
    const session = await getServerSession();
    console.log("Session:", session?.user?.id ?? "NO SESSION");

    if (!session?.user?.id) {
      console.error("FRIEND ACCEPT ERROR: No session / unauthorized");
      return unauthorized();
    }

    const raw = await req.json();
    console.log("Request body:", JSON.stringify(raw));

    const parsed = acceptFriendSchema.safeParse(raw);
    if (!parsed.success) {
      console.error("FRIEND ACCEPT ERROR: Validation failed", parsed.error.flatten());
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { requestId } = parsed.data;
    console.log("Looking up requestId:", requestId);

    await dbConnect();

    const request = await FriendRequest.findById(requestId);
    console.log("Friend request found:", !!request, request ? `status=${request.status} sender=${request.sender} receiver=${request.receiver}` : "");

    if (!request) {
      console.error("FRIEND ACCEPT ERROR: Request not found for id:", requestId);
      return NextResponse.json({ error: "Friend request not found" }, { status: 404 });
    }

    if (request.receiver.toString() !== session.user.id) {
      console.error("FRIEND ACCEPT ERROR: Receiver mismatch", {
        expected: session.user.id,
        actual: request.receiver.toString(),
      });
      return NextResponse.json({ error: "Not authorized to accept this request" }, { status: 403 });
    }

    if (request.status !== "pending") {
      console.error("FRIEND ACCEPT ERROR: Request not pending, status:", request.status);
      return NextResponse.json({ error: "Friend request is not pending" }, { status: 400 });
    }

    const [user1, user2] = sortIds(request.sender.toString(), request.receiver.toString());
    console.log("Sorted user IDs:", { user1, user2 });

    const existingFriendship = await Friendship.findOne({ user1, user2 });
    if (!existingFriendship) {
      console.log("Creating friendship...");
      try {
        await Friendship.create({ user1, user2 });
        console.log("Friendship created successfully");
      } catch (err: unknown) {
        const mongoErr = err as { code?: number };
        if (mongoErr.code !== 11000) throw err;
        console.log("Friendship already existed (race condition), continuing");
      }
    } else {
      console.log("Friendship already exists");
    }

    let conversationId: string;
    const objUser1 = new mongoose.Types.ObjectId(user1);
    const objUser2 = new mongoose.Types.ObjectId(user2);

    let existingConversation = await Conversation.findOne({
      participants: { $all: [objUser1, objUser2], $size: 2 },
    });

    if (!existingConversation) {
      existingConversation = await Conversation.findOne({
        participants: { $all: [objUser1, objUser2] },
      });
    }

    if (existingConversation) {
      conversationId = existingConversation._id.toString();
      console.log("Conversation already exists:", conversationId);
    } else {
      console.log("Creating conversation...");
      try {
        const conversation = await Conversation.create({
          participants: [user1, user2],
          lastMessageAt: null,
        });
        conversationId = conversation._id.toString();
        console.log("Conversation created:", conversationId);
      } catch (err: unknown) {
        const mongoErr = err as { code?: number };
        if (mongoErr.code !== 11000) throw err;
        console.log("Conversation duplicate key — refetching...");
        const convo = await Conversation.findOne({
          $or: [
            { participants: objUser1 },
            { participants: objUser2 },
          ],
        });
        if (convo) {
          conversationId = convo._id.toString();
          console.log("Existing conversation found:", conversationId);
        } else {
          throw new Error("Conversation exists (duplicate key) but cannot be found");
        }
      }
    }

    const [accepter, sender] = await Promise.all([
      User.findById(session.user.id).select("keys").lean(),
      User.findById(request.sender.toString()).select("keys").lean(),
    ]);

    const accepterKey = getLatestKey(accepter);
    const senderKey = getLatestKey(sender);

    console.log("Setting friend request status to accepted...");
    await FriendRequest.findByIdAndUpdate(requestId, { status: "accepted" });
    console.log("Friend request status updated");

    try {
      await triggerUserEvent(request.sender.toString(), "friendship-accepted", {
        conversationId,
        friendId: session.user.id,
      });
      console.log("Pusher event sent successfully");
    } catch (e) {
      console.error("Pusher event failed (non-fatal):", e);
    }

    console.log("=== FRIEND ACCEPT SUCCESS ===");
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
    console.error("FRIEND ACCEPT ERROR:", error);
    return serverError(error);
  }
}
