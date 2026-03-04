import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { id: "asc" },
    select: { id: true, username: true, balance: true },
  });
  return NextResponse.json(users);
}
