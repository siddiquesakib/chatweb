import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import dbConnect from "@/lib/db";
import Message from "@/models/message";
import Conversation from "@/models/conversation";
import Friendship from "@/models/friendship";
import { triggerConversationEvent, triggerUserEvent } from "@/lib/pusher/server";
import { sendMessageSchema } from "@/lib/validations";
import { sortIds, unauthorized, serverError, tooMany } from "@/lib/utils/api";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) return unauthorized();

    const raw = await req.json();
    const parsed = sendMessageSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { conversationId, encryptedText, iv } = parsed.data;

    const allowed = await checkRateLimit(`msg:${session.user.id}:${conversationId}`);
    if (!allowed) return tooMany("Too fast. Slow down.");

    await dbConnect();

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const isParticipant = conversation.participants.some(
      (p: string) => p.toString() === session.user.id,
    );
    if (!isParticipant) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    const otherParticipant = conversation.participants.find(
      (p: string) => p.toString() !== session.user.id,
    );
    if (!otherParticipant) {
      return NextResponse.json({ error: "No other participant" }, { status: 400 });
    }

    const [user1, user2] = sortIds(session.user.id, otherParticipant.toString());
    const friendship = await Friendship.findOne({ user1, user2 });
    if (!friendship) {
      return NextResponse.json({ error: "You can only message friends" }, { status: 403 });
    }

    const message = await Message.create({
      conversationId,
      senderId: session.user.id,
      receiverId: otherParticipant.toString(),
      encryptedText: encryptedText.trim(),
      iv,
    });

    const msgData = {
      id: message._id.toString(),
      conversationId: message.conversationId.toString(),
      senderId: message.senderId.toString(),
      receiverId: message.receiverId?.toString(),
      encryptedText: message.encryptedText,
      iv: message.iv,
      seen: message.seen,
      createdAt: message.createdAt,
    };

    conversation.lastMessageAt = new Date();
    conversation.lastMessage = {
      text: "🔒 Encrypted message",
      senderId: message.senderId,
      senderName: session.user.name ?? session.user.username,
    };
    await conversation.save();

    try {
      await triggerConversationEvent(conversationId, "new-message", {
        message: msgData,
        sender: {
          id: session.user.id,
          name: session.user.name,
          username: session.user.username,
          image: session.user.image,
        },
      });
      await triggerUserEvent(otherParticipant.toString(), "conversation-update", {
        conversationId,
      });
    } catch (e) {
      console.error("Pusher events failed (non-fatal):", e);
    }

    return NextResponse.json({ message: msgData }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
