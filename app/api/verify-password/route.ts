import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const correct = process.env.GENERATE_PASSWORD;

  if (!correct) {
    return NextResponse.json({ valid: true });
  }

  return NextResponse.json({ valid: password === correct });
}
