import { NextRequest, NextResponse } from "next/server";
import { CREATOR_SYSTEM_PROMPT, MODIFY_SYSTEM_PROMPT } from "@/lib/prompts";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { userMessage, isModify } = await req.json();

  const geminiUrl = process.env.GEMINI_PHP_URL;
  if (!geminiUrl) {
    return NextResponse.json(
      { status: "error", message: "GEMINI_PHP_URL not configured" },
      { status: 500 }
    );
  }

  const systemPrompt = isModify ? MODIFY_SYSTEM_PROMPT : CREATOR_SYSTEM_PROMPT;

  try {
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationHistory: [],
        prompt: systemPrompt,
        userMessage: userMessage,
      }),
    });

    const responseText = await response.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("Gemini API returned invalid JSON:", responseText.substring(0, 500));
      return NextResponse.json(
        { status: "error", message: "Gemini API returned an invalid response. The server may have timed out." },
        { status: 502 }
      );
    }

    if (!response.ok) {
      console.error("Gemini PHP error:", response.status, JSON.stringify(data));
      return NextResponse.json(
        { status: "error", message: data.message || `Gemini API error: ${response.status}` },
        { status: response.status }
      );
    }

    if (data.status === "success" && data.botReply) {
      return NextResponse.json({
        status: "success",
        botReply: data.botReply,
      });
    }

    return NextResponse.json({
      status: "error",
      message: data.message || "No response from Gemini: " + JSON.stringify(data).substring(0, 200),
    });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to call Gemini API" },
      { status: 500 }
    );
  }
}
