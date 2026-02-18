import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const maxDuration = 60;

const OPENAI_BASE = "https://api.openai.com/v1";

export async function POST(req: NextRequest) {
  const incomingForm = await req.formData();
  const prompt = incomingForm.get("prompt") as string;
  const duration = incomingForm.get("duration") as string;
  const size = incomingForm.get("size") as string;
  const image = incomingForm.get("image") as File | null;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "your_openai_api_key_here") {
    return NextResponse.json(
      { status: "error", message: "OPENAI_API_KEY not configured" },
      { status: 500 }
    );
  }

  const headers = {
    "Authorization": `Bearer ${apiKey}`,
  };

  const formData = new FormData();
  formData.append("model", "sora-2");
  formData.append("prompt", prompt);
  formData.append("size", size || "1280x720");
  formData.append("seconds", String(duration || 4));

  if (image && image.size > 0) {
    const [width, height] = (size || "1280x720").split("x").map(Number);
    const arrayBuffer = await image.arrayBuffer();
    const resizedBuffer = await sharp(Buffer.from(arrayBuffer))
      .resize(width, height, { fit: "cover" })
      .jpeg()
      .toBuffer();
    const blob = new Blob([new Uint8Array(resizedBuffer)], { type: "image/jpeg" });
    formData.append("input_reference", blob, "reference.jpg");
  }

  try {
    const createRes = await fetch(`${OPENAI_BASE}/videos`, {
      method: "POST",
      headers,
      body: formData,
    });

    const createData = await createRes.json();

    if (!createRes.ok) {
      console.error("Sora create error:", createData);
      return NextResponse.json(
        { status: "error", message: createData.error?.message || "Failed to start video generation" },
        { status: createRes.status }
      );
    }

    const videoId = createData.id;
    if (!videoId) {
      return NextResponse.json(
        { status: "error", message: "No video ID returned from Sora" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "pending",
      videoId,
    });
  } catch (error: unknown) {
    console.error("Sora API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate video";
    return NextResponse.json(
      { status: "error", message: errorMessage },
      { status: 500 }
    );
  }
}
