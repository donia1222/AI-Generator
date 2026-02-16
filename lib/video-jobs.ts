// In-memory store for active video generation jobs
type VideoJob = {
  videoId?: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  progress: number;
  videoUrl?: string;
  error?: string;
  createdAt: number;
};

// Use globalThis to persist jobs across Next.js dev server hot reloads
const globalForJobs = globalThis as unknown as {
  jobs: Map<string, VideoJob> | undefined;
};

const jobs = globalForJobs.jobs ?? new Map<string, VideoJob>();
globalForJobs.jobs = jobs;

export function createJob(jobId: string, videoId?: string): void {
  jobs.set(jobId, {
    videoId,
    status: "queued",
    progress: 0,
    createdAt: Date.now(),
  });
  console.log(`✅ Job created: ${jobId} (Total jobs: ${jobs.size})`);
}

export function updateJob(
  jobId: string,
  updates: Partial<Omit<VideoJob, "createdAt">>
): void {
  const job = jobs.get(jobId);
  if (job) {
    Object.assign(job, updates);
  }
}

export function getJob(jobId: string): VideoJob | undefined {
  const job = jobs.get(jobId);
  console.log(`🔍 Get job: ${jobId} - ${job ? 'Found' : 'NOT FOUND'} (Total jobs: ${jobs.size})`);
  return job;
}

export function deleteJob(jobId: string): void {
  jobs.delete(jobId);
}

// Clean up jobs older than 10 minutes
export function cleanupOldJobs(): void {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;
  jobs.forEach((job, jobId) => {
    if (now - job.createdAt > tenMinutes) {
      jobs.delete(jobId);
    }
  });
}
