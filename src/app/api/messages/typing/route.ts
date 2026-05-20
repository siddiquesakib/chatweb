import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import dbConnect from "@/lib/db";
import Conversation from "@/models/conversation";
import { triggerConversationEvent } from "@/lib/pusher/server";
import { typingSchema } from "@/lib/validations";
import { unauthorized, serverError } from "@/lib/utils/api";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) return unauthorized();

    const raw = await req.json();
    const parsed = typingSchema.safeParse(raw);
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

    try {
      await triggerConversationEvent(conversationId, "typing", {
        senderId: session.user.id,
      });
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
