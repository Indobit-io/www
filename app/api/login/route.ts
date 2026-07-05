import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AUTH_COOKIE = "cst_auth";

function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export async function POST(req: Request) {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) {
    return NextResponse.json({ error: "Auth tidak aktif (APP_PASSWORD belum diset)" }, { status: 400 });
  }

  const { password } = await req.json();
  if (typeof password !== "string" || !password) {
    return NextResponse.json({ error: "Password wajib diisi" }, { status: 400 });
  }

  const given = Buffer.from(sha256Hex(password));
  const expected = Buffer.from(sha256Hex(appPassword));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: "Password salah" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, sha256Hex(appPassword), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
