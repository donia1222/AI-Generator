import { NextRequest, NextResponse } from "next/server";
import { CREATOR_SYSTEM_PROMPT, MODIFY_SYSTEM_PROMPT } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  const { userMessage, isModify } = await req.json();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { status: "error", message: "GEMINI_API_KEY not configured. Please add your key to .env.local" },
      { status: 500 }
    );
  }

  const systemPrompt = isModify ? MODIFY_SYSTEM_PROMPT : CREATOR_SYSTEM_PROMPT;
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`;

  const postBody = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userMessage }],
      },
    ],
  };

  try {
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postBody),
    });

    const geminiData = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { status: "error", message: geminiData.error?.message || `Gemini API error: ${response.status}` },
        { status: response.status }
      );
    }

    if (geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      return NextResponse.json({
        status: "success",
        botReply: geminiData.candidates[0].content.parts[0].text,
      });
    }

    return NextResponse.json({
      status: "error",
      message: "No response from Gemini: " + JSON.stringify(geminiData).substring(0, 200),
    });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to call Gemini API" },
      { status: 500 }
    );
  }
}
