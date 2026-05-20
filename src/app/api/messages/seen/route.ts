import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import dbConnect from "@/lib/db";
import Message from "@/models/message";
import Conversation from "@/models/conversation";
import { triggerConversationEvent } from "@/lib/pusher/server";
import { seenSchema } from "@/lib/validations";
import { unauthorized, serverError } from "@/lib/utils/api";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) return unauthorized();

    const raw = await req.json();
    const parsed = seenSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { conversationId } = parsed.data;

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

    await Message.updateMany(
      { conversationId, senderId: { $ne: session.user.id }, seen: false },
      { $set: { seen: true } },
    );

    try {
      await triggerConversationEvent(conversationId, "messages-seen", {
        conversationId,
      });
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
