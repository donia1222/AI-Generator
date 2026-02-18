import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

const OPENAI_BASE = "https://api.openai.com/v1";

export async function POST(req: NextRequest) {
  const incomingForm = await req.formData();
  const mode = incomingForm.get("mode") as string; // "generate" | "edit"
  const prompt = incomingForm.get("prompt") as string;
  const size = (incomingForm.get("size") as string) || "1024x1024";
  const quality = (incomingForm.get("quality") as string) || "high";
  const model = (incomingForm.get("model") as string) || "gpt-image-1";
  const image = incomingForm.get("image") as File | null;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "your_openai_api_key_here") {
    return NextResponse.json(
      { status: "error", message: "OPENAI_API_KEY not configured" },
      { status: 500 }
    );
  }

  if (!prompt?.trim()) {
    return NextResponse.json(
      { status: "error", message: "Prompt is required" },
      { status: 400 }
    );
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
  };

  try {
    if (mode === "edit" && image && image.size > 0) {
      // Edit mode: use /v1/images/edits with multipart/form-data
      const formData = new FormData();
      formData.append("model", model);
      formData.append("prompt", prompt);
      formData.append("size", size);
      formData.append("quality", quality);

      // Convert uploaded file to proper format
      const imageBuffer = await image.arrayBuffer();
      const imageBlob = new Blob([imageBuffer], { type: image.type || "image/png" });
      formData.append("image[]", imageBlob, image.name || "image.png");

      const res = await fetch(`${OPENAI_BASE}/images/edits`, {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("OpenAI image edit error:", data);
        return NextResponse.json(
          {
            status: "error",
            message: data.error?.message || "Bildbearbeitung fehlgeschlagen",
          },
          { status: res.status }
        );
      }

      const imageData = data.data?.[0];
      if (!imageData) {
        return NextResponse.json(
          { status: "error", message: "Keine Bilddaten erhalten" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        status: "success",
        image: imageData.b64_json
          ? `data:image/png;base64,${imageData.b64_json}`
          : imageData.url,
      });
    } else {
      // Generate mode: use /v1/images/generations with JSON body
      const res = await fetch(`${OPENAI_BASE}/images/generations`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt,
          n: 1,
          size,
          quality,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("OpenAI image generation error:", data);
        return NextResponse.json(
          {
            status: "error",
            message: data.error?.message || "Bildgenerierung fehlgeschlagen",
          },
          { status: res.status }
        );
      }

      const imageData = data.data?.[0];
      if (!imageData) {
        return NextResponse.json(
          { status: "error", message: "Keine Bilddaten erhalten" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        status: "success",
        image: imageData.b64_json
          ? `data:image/png;base64,${imageData.b64_json}`
          : imageData.url,
      });
    }
  } catch (error: unknown) {
    console.error("Image API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json(
      { status: "error", message: errorMessage },
      { status: 500 }
    );
  }
}
