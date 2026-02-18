import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const OPENAI_BASE = "https://api.openai.com/v1";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get("videoId");

  if (!videoId) {
    return NextResponse.json(
      { status: "error", message: "Missing videoId parameter" },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { status: "error", message: "OPENAI_API_KEY not configured" },
      { status: 500 }
    );
  }

  const headers = {
    "Authorization": `Bearer ${apiKey}`,
  };

  try {
    const statusRes = await fetch(`${OPENAI_BASE}/videos/${videoId}`, { headers });
    const statusData = await statusRes.json();

    if (!statusRes.ok) {
      console.error("Sora status error:", statusData);
      return NextResponse.json(
        { status: "error", message: statusData.error?.message || "Failed to get video status" },
        { status: statusRes.status }
      );
    }

    console.log("Sora status:", statusData.status, statusData.progress);

    if (statusData.status === "completed") {
      // Try to get video URL from status data first
      const generationUrl = statusData.generations?.[0]?.url || statusData.url;

      if (generationUrl) {
        return NextResponse.json({
          status: "completed",
          progress: 100,
          videoUrl: generationUrl,
        });
      }

      // Fall back to content endpoint
      const contentRes = await fetch(`${OPENAI_BASE}/videos/${videoId}/content`, { headers });
      const contentType = contentRes.headers.get("content-type") || "";
      let videoUrl: string | undefined;

      if (contentType.includes("video") || contentType.includes("octet-stream")) {
        const buffer = await contentRes.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        videoUrl = `data:video/mp4;base64,${base64}`;
      } else {
        const contentData = await contentRes.json().catch(() => null);
        if (contentData?.url) {
          videoUrl = contentData.url;
        } else if (contentRes.url && contentRes.url !== `${OPENAI_BASE}/videos/${videoId}/content`) {
          videoUrl = contentRes.url;
        }
      }

      if (!videoUrl) {
        return NextResponse.json({
          status: "failed",
          error: "Video completed but could not extract URL",
        });
      }

      return NextResponse.json({
        status: "completed",
        progress: 100,
        videoUrl,
      });
    }

    if (statusData.status === "failed") {
      return NextResponse.json({
        status: "failed",
        error: statusData.error?.message || "Video generation failed",
      });
    }

    return NextResponse.json({
      status: statusData.status === "queued" ? "queued" : "in_progress",
      progress: statusData.progress || 0,
    });
  } catch (error: unknown) {
    console.error("Video status error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to get video status";
    return NextResponse.json(
      { status: "error", message: errorMessage },
      { status: 500 }
    );
  }
}
