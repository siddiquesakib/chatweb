import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import dbConnect from "@/lib/db";
import Message from "@/models/message";
import Conversation from "@/models/conversation";
import { unauthorized, serverError } from "@/lib/utils/api";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) return unauthorized();

    const { conversationId } = await params;

    await dbConnect();

    const conversation = await Conversation.findById(conversationId).select("participants").lean();
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const isParticipant = (conversation.participants as unknown as string[]).some(
      (p: string) => p.toString() === session.user.id,
    );
    if (!isParticipant) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    const url = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "30") || 30, 1), 100);
    const before = url.searchParams.get("before");

    const query: Record<string, unknown> = { conversationId };
    if (before) {
      query._id = { $lt: before };
    }

    const messages = await Message.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = messages.length > limit;
    const list = (hasMore ? messages.slice(0, limit) : messages).reverse();

    const msgs = list.map((m) => ({
      id: m._id.toString(),
      conversationId: m.conversationId.toString(),
      senderId: m.senderId.toString(),
      receiverId: m.receiverId?.toString(),
      encryptedText: m.encryptedText,
      iv: m.iv,
      seen: m.seen,
      createdAt: m.createdAt,
    }));

    return NextResponse.json({ messages: msgs, hasMore });
  } catch (error) {
    return serverError(error);
  }
}
