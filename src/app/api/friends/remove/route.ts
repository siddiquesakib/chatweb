import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import dbConnect from "@/lib/db";
import Friendship from "@/models/friendship";
import { removeFriendSchema } from "@/lib/validations";
import { sortIds, unauthorized, serverError } from "@/lib/utils/api";

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) return unauthorized();

    const raw = await req.json();
    const parsed = removeFriendSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const [user1, user2] = sortIds(session.user.id, parsed.data.friendId);

    await dbConnect();
    await Friendship.deleteOne({ user1, user2 });

    return NextResponse.json({ message: "Friend removed" });
  } catch (error) {
    return serverError(error);
  }
}
