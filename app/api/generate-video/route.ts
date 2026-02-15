import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const maxDuration = 300;

const OPENAI_BASE = "https://api.openai.com/v1";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  // size comes directly from frontend as "1280x720" or "720x1280"
  const formData = new FormData();
  formData.append("model", "sora-2");
  formData.append("prompt", prompt);
  formData.append("size", size || "1280x720");
  formData.append("seconds", String(duration || 4));

  // Attach reference image resized to match video dimensions
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
    // Step 1: Create video job
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
        { status: "error", message: "No video job ID returned" },
        { status: 500 }
      );
    }

    // Step 2: Poll for completion (max ~4 minutes)
    for (let i = 0; i < 48; i++) {
      await sleep(5000);

      const statusRes = await fetch(`${OPENAI_BASE}/videos/${videoId}`, {
        headers,
      });

      const statusData = await statusRes.json();
      console.log(`Sora poll ${i + 1}:`, statusData.status, statusData.progress ?? "");

      if (statusData.status === "completed") {
        // Step 3: Download the video content via /videos/{id}/content
        const contentRes = await fetch(
          `${OPENAI_BASE}/videos/${videoId}/content`,
          { headers }
        );

        if (!contentRes.ok) {
          console.error("Sora content error:", contentRes.status);
          return NextResponse.json({
            status: "error",
            message: "Video completed but failed to get download URL",
          });
        }

        // The content endpoint returns the video file or a redirect URL
        const contentType = contentRes.headers.get("content-type") || "";

        if (contentType.includes("video") || contentType.includes("octet-stream")) {
          // It returns the binary directly — convert to base64 data URL
          const buffer = await contentRes.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          const videoUrl = `data:video/mp4;base64,${base64}`;
          return NextResponse.json({ status: "success", videoUrl });
        }

        // It might return JSON with a URL
        const contentData = await contentRes.json().catch(() => null);
        if (contentData?.url) {
          return NextResponse.json({ status: "success", videoUrl: contentData.url });
        }

        // Check if it was a redirect (the final URL)
        if (contentRes.url && contentRes.url !== `${OPENAI_BASE}/videos/${videoId}/content`) {
          return NextResponse.json({ status: "success", videoUrl: contentRes.url });
        }

        return NextResponse.json({
          status: "error",
          message: "Video completed but could not extract download URL",
        });
      }

      if (statusData.status === "failed") {
        return NextResponse.json({
          status: "error",
          message: statusData.error?.message || "Video generation failed",
        });
      }
    }

    return NextResponse.json({
      status: "error",
      message: "Video generation timed out. Please try again.",
    });
  } catch (error: unknown) {
    console.error("Sora API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate video";
    return NextResponse.json(
      { status: "error", message: errorMessage },
      { status: 500 }
    );
  }
}
