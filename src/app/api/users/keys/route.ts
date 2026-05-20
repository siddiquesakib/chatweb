import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import dbConnect from "@/lib/db";
import User from "@/models/user";
import { setupKeySchema } from "@/lib/validations";
import { unauthorized, serverError } from "@/lib/utils/api";

export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) return unauthorized();

    const raw = await req.json();
    const parsed = setupKeySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { publicKey, keyVersion } = parsed.data;

    await dbConnect();

    await User.findByIdAndUpdate(session.user.id, {
      $push: { keys: { publicKey, keyVersion } },
      publicKey,
      keyVersion,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
