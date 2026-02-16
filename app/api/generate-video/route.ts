import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createJob, updateJob } from "@/lib/video-jobs";

export const maxDuration = 300;

const OPENAI_BASE = "https://api.openai.com/v1";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollVideoGeneration(jobId: string, videoId: string, apiKey: string) {
  const headers = {
    "Authorization": `Bearer ${apiKey}`,
  };

  // Poll for completion (max ~4 minutes)
  for (let i = 0; i < 48; i++) {
    await sleep(5000);

    try {
      const statusRes = await fetch(`${OPENAI_BASE}/videos/${videoId}`, {
        headers,
      });

      const statusData = await statusRes.json();
      const progress = statusData.progress || 0;
      console.log(`Sora poll ${i + 1}:`, statusData.status, progress);

      // Update job with current progress
      updateJob(jobId, {
        status: statusData.status === "queued" ? "queued" : "in_progress",
        progress: progress,
      });

      if (statusData.status === "completed") {
        // Download the video content via /videos/{id}/content
        const contentRes = await fetch(
          `${OPENAI_BASE}/videos/${videoId}/content`,
          { headers }
        );

        if (!contentRes.ok) {
          console.error("Sora content error:", contentRes.status);
          updateJob(jobId, {
            status: "failed",
            error: "Video completed but failed to get download URL",
          });
          return;
        }

        // The content endpoint returns the video file or a redirect URL
        const contentType = contentRes.headers.get("content-type") || "";

        let videoUrl: string | undefined;

        if (contentType.includes("video") || contentType.includes("octet-stream")) {
          // It returns the binary directly — convert to base64 data URL
          const buffer = await contentRes.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          videoUrl = `data:video/mp4;base64,${base64}`;
        } else {
          // It might return JSON with a URL
          const contentData = await contentRes.json().catch(() => null);
          if (contentData?.url) {
            videoUrl = contentData.url;
          } else if (contentRes.url && contentRes.url !== `${OPENAI_BASE}/videos/${videoId}/content`) {
            // Check if it was a redirect (the final URL)
            videoUrl = contentRes.url;
          }
        }

        if (videoUrl) {
          updateJob(jobId, {
            status: "completed",
            progress: 100,
            videoUrl,
          });
        } else {
          updateJob(jobId, {
            status: "failed",
            error: "Video completed but could not extract download URL",
          });
        }
        return;
      }

      if (statusData.status === "failed") {
        updateJob(jobId, {
          status: "failed",
          error: statusData.error?.message || "Video generation failed",
        });
        return;
      }
    } catch (error) {
      console.error("Polling error:", error);
      // Continue polling on error
    }
  }

  // Timeout
  updateJob(jobId, {
    status: "failed",
    error: "Video generation timed out. Please try again.",
  });
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

  // Create a unique job ID and store it IMMEDIATELY before making the API call
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create the job in the store immediately so polling can start
  createJob(jobId);

  try {
    // Step 1: Create video job with Sora
    const createRes = await fetch(`${OPENAI_BASE}/videos`, {
      method: "POST",
      headers,
      body: formData,
    });

    const createData = await createRes.json();

    if (!createRes.ok) {
      console.error("Sora create error:", createData);
      updateJob(jobId, {
        status: "failed",
        error: createData.error?.message || "Failed to start video generation",
      });
      return NextResponse.json(
        { status: "error", message: createData.error?.message || "Failed to start video generation" },
        { status: createRes.status }
      );
    }

    const videoId = createData.id;
    if (!videoId) {
      updateJob(jobId, {
        status: "failed",
        error: "No video job ID returned",
      });
      return NextResponse.json(
        { status: "error", message: "No video job ID returned" },
        { status: 500 }
      );
    }

    // Update the job with the video ID
    updateJob(jobId, { videoId });

    // Start polling in background (don't await)
    pollVideoGeneration(jobId, videoId, apiKey).catch((error) => {
      console.error("Background polling error:", error);
      updateJob(jobId, {
        status: "failed",
        error: "Internal error during video generation",
      });
    });

    // Return the job ID immediately
    return NextResponse.json({
      status: "pending",
      jobId,
    });
  } catch (error: unknown) {
    console.error("Sora API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate video";
    updateJob(jobId, {
      status: "failed",
      error: errorMessage,
    });
    return NextResponse.json(
      { status: "error", message: errorMessage },
      { status: 500 }
    );
  }
}
