import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import dbConnect from "@/lib/db";
import Conversation from "@/models/conversation";
import { conversationKeySchema } from "@/lib/validations";
import { unauthorized, serverError } from "@/lib/utils/api";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) return unauthorized();

    const { id } = await params;

    await dbConnect();

    const conversation = await Conversation.findById(id).select("participants keyBundles").lean();
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const isParticipant = (conversation.participants as unknown as string[]).some(
      (p: string) => p.toString() === session.user.id,
    );
    if (!isParticipant) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    const keyBundles = (conversation as { keyBundles?: { userId: string; encryptedKey: string }[] }).keyBundles ?? [];
    const userKey = keyBundles.find((k) => k.userId.toString() === session.user.id);

    return NextResponse.json({ encryptedKey: userKey?.encryptedKey ?? null });
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) return unauthorized();

    const { id } = await params;
    const raw = await req.json();
    const parsed = conversationKeySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    await dbConnect();

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const isParticipant = (conversation.participants as unknown as string[]).some(
      (p: string) => p.toString() === session.user.id,
    );
    if (!isParticipant) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    await Conversation.findByIdAndUpdate(id, {
      $set: { keyBundles: parsed.data.keyBundles },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
