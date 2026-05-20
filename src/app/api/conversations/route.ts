import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "@/lib/auth/session";
import dbConnect from "@/lib/db";
import Conversation from "@/models/conversation";
import User from "@/models/user";
import { createConversationSchema } from "@/lib/validations";
import { getLatestKey, unauthorized, serverError } from "@/lib/utils/api";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) return unauthorized();

    await dbConnect();

    const conversations = await Conversation.find({
      participants: session.user.id,
    })
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .lean();

    const participantIds = [
      ...new Set(
        conversations.flatMap((c) =>
          c.participants.map((p: string) => p.toString()),
        ),
      ),
    ];

    const users = await User.find({ _id: { $in: participantIds } })
      .select("name username image lastActiveAt keys")
      .lean();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const now = Date.now();

    const data = conversations.map((c) => {
      const participants = c.participants.map((p: string) => {
        const u = userMap.get(p.toString());
        const lastActive = u?.lastActiveAt
          ? new Date(u.lastActiveAt).getTime()
          : 0;
        const keys = (u as { keys?: { publicKey: string; keyVersion: number }[] } | undefined)?.keys ?? [];
        const latestKey = getLatestKey(keys.length > 0 ? { keys } : null);
        return {
          _id: p.toString(),
          name: u?.name ?? "Unknown",
          username: u?.username ?? "",
          image: u?.image ?? "",
          online: now - lastActive < 120000,
          publicKey: latestKey?.publicKey ?? null,
          keyVersion: latestKey?.keyVersion ?? null,
        };
      });

      const lastMsg = c.lastMessage
        ? {
            text: c.lastMessage.text,
            senderId: c.lastMessage.senderId?.toString() ?? null,
            senderName: c.lastMessage.senderName ?? null,
          }
        : null;

      return {
        _id: c._id.toString(),
        participants,
        lastMessage: lastMsg,
        lastMessageAt: c.lastMessageAt,
        createdAt: c.createdAt,
      };
    });

    return NextResponse.json({ conversations: data });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) return unauthorized();

    const raw = await req.json();
    const parsed = createConversationSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    if (!parsed.data.participantIds.includes(session.user.id)) {
      return NextResponse.json({ error: "You must be a participant" }, { status: 400 });
    }

    await dbConnect();

    const sorted = [...parsed.data.participantIds].sort();
    const sortedObjIds = sorted.map((id) => new mongoose.Types.ObjectId(id));

    const existing = await Conversation.findOne({
      participants: { $all: sortedObjIds, $size: sorted.length },
    });

    if (existing) {
      return NextResponse.json(
        { message: "Conversation already exists", conversationId: existing._id.toString() },
        { status: 200 },
      );
    }

    const conversation = await Conversation.create({
      participants: sorted,
      lastMessageAt: null,
    });

    return NextResponse.json(
      { message: "Conversation created", conversationId: conversation._id.toString() },
      { status: 201 },
    );
  } catch (error) {
    return serverError(error);
  }
}
