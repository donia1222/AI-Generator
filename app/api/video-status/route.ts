import { NextRequest, NextResponse } from "next/server";
import { getJob, deleteJob } from "@/lib/video-jobs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json(
      { status: "error", message: "Missing jobId parameter" },
      { status: 400 }
    );
  }

  const job = getJob(jobId);

  if (!job) {
    return NextResponse.json(
      { status: "error", message: "Job not found" },
      { status: 404 }
    );
  }

  const response = {
    status: job.status,
    progress: job.progress,
    videoUrl: job.videoUrl,
    error: job.error,
  };

  // Clean up completed or failed jobs after returning status
  if (job.status === "completed" || job.status === "failed") {
    // Delete after a longer delay to allow client to fetch multiple times
    setTimeout(() => deleteJob(jobId), 30000);
  }

  return NextResponse.json(response);
}
