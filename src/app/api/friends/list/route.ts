import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import dbConnect from "@/lib/db";
import Friendship from "@/models/friendship";
import User from "@/models/user";
import type { FriendListEntry } from "@/types/friend";
import { unauthorized, serverError } from "@/lib/utils/api";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) return unauthorized();

    await dbConnect();

    const friendships = await Friendship.find({
      $or: [{ user1: session.user.id }, { user2: session.user.id }],
    }).lean();

    const friendIds = friendships.map((f) =>
      f.user1 === session.user.id ? f.user2 : f.user1,
    );

    const users = await User.find({ _id: { $in: friendIds } })
      .select("name username image lastActiveAt keys")
      .lean();

    const now = Date.now();
    const friends: FriendListEntry[] = users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      username: u.username,
      image: u.image,
      online: u.lastActiveAt ? now - new Date(u.lastActiveAt).getTime() < 120000 : false,
      lastActiveAt: u.lastActiveAt,
    }));

    return NextResponse.json({ friends });
  } catch (error) {
    return serverError(error);
  }
}
