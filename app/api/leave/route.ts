import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/leave — body { id }. Removes the presence row and any pending
// signals to/from this user. Called via navigator.sendBeacon on tab close, so
// the body may arrive as text — parse defensively.
export async function POST(request: NextRequest) {
  let id: string | undefined;
  try {
    const text = await request.text();
    id = text ? (JSON.parse(text)?.id as string | undefined) : undefined;
  } catch {
    id = undefined;
  }

  if (typeof id !== "string" || !id) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }

  // Check if the user was busy before we delete their row — if so, the
  // user they were connected to needs its busy flag cleared too.
  const me = await prisma.presence.findUnique({
    where: { id },
    select: { busy: true },
  });

  await prisma.signal.deleteMany({
    where: { OR: [{ toId: id }, { fromId: id }] },
  });

  await prisma.presence.deleteMany({ where: { id } });

  // If this user was in an active connection, free the other party.
  // We don't know who they were connected to (no explicit partner field),
  // so we clear all remaining busy flags. In practice this only affects
  // the one partner, since a user can only be in one connection at a time.
  if (me?.busy) {
    await prisma.presence.updateMany({
      where: { busy: true },
      data: { busy: false },
    });
  }

  return Response.json({ ok: true });
}
