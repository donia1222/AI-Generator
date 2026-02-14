import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { status: "error", message: "OPENAI_API_KEY not configured" },
      { status: 500 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { status: "error", message: "No file provided" },
      { status: 400 }
    );
  }

  try {
    const whisperForm = new FormData();
    whisperForm.append("file", file);
    whisperForm.append("model", "whisper-1");
    whisperForm.append("response_format", "text");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: whisperForm,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Whisper error:", errText);
      throw new Error("Transcription failed");
    }

    const text = await res.text();
    console.log("Whisper transcription:", text.substring(0, 200));

    return NextResponse.json({
      status: "success",
      text: text.trim(),
    });
  } catch (error: unknown) {
    console.error("Transcribe error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Transcription failed",
      },
      { status: 500 }
    );
  }
}
