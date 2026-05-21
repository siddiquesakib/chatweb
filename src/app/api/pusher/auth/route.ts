import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getPusherClient } from "@/lib/pusher/server";
import dbConnect from "@/lib/db";
import Conversation from "@/models/conversation";
import { unauthorized, serverError } from "@/lib/utils/api";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) return unauthorized();

    const formData = await req.formData();
    const socketId = formData.get("socket_id") as string;
    const channelName = formData.get("channel_name") as string;

    if (!socketId || !channelName) {
      return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
    }

    if (channelName.startsWith("private-chat-")) {
      const conversationId = channelName.replace("private-chat-", "");
      await dbConnect();
      const conversation = await Conversation.findById(conversationId)
        .select("participants")
        .lean();
      if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      const isParticipant = (conversation.participants as unknown as string[]).some(
        (p: string) => p.toString() === session.user.id,
      );
      if (!isParticipant) {
        return NextResponse.json({ error: "Not a participant" }, { status: 403 });
      }
      const pusher = getPusherClient();
      const auth = pusher.authorizeChannel(socketId, channelName);
      return NextResponse.json(auth);
    }

    if (channelName.startsWith("private-user-")) {
      const userId = channelName.replace("private-user-", "");
      if (userId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const pusher = getPusherClient();
      const auth = pusher.authorizeChannel(socketId, channelName);
      return NextResponse.json(auth);
    }

    if (channelName.startsWith("presence-")) {
      const presenceData = {
        user_id: session.user.id,
        user_info: {
          name: session.user.name ?? session.user.username,
          username: session.user.username,
          image: session.user.image ?? "",
        },
      };
      const pusher = getPusherClient();
      const auth = pusher.authorizeChannel(socketId, channelName, presenceData);
      return NextResponse.json(auth);
    }

    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  } catch (error) {
    return serverError(error);
  }
}
