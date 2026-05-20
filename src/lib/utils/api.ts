import { NextResponse } from "next/server";

export function sortIds(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function getLatestKey(
  user: { keys?: { publicKey: string; keyVersion: number }[] } | null,
): { publicKey: string; keyVersion: number } | null {
  if (!user || !user.keys || user.keys.length === 0) return null;
  return user.keys.reduce((a, b) => (a.keyVersion > b.keyVersion ? a : b));
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function badRequest(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 400 });
}

export function notFound(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 404 });
}

export function forbidden(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 403 });
}

export function tooMany(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 429 });
}

export function serverError(error: unknown): NextResponse {
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
