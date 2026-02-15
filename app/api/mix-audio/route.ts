import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

const exec = promisify(execFile);

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { instrumentalUrl, instrumentalBase64, vocalBase64, vocalVolume = 1.0, instrumentalVolume = 0.45 } =
    await req.json();

  if ((!instrumentalUrl && !instrumentalBase64) || !vocalBase64) {
    return NextResponse.json(
      { status: "error", message: "Missing audio data" },
      { status: 400 }
    );
  }

  const tmpDir = await mkdtemp(path.join(tmpdir(), "mix-"));
  const vocalPath = path.join(tmpDir, "vocal.mp3");
  const instrumentalPath = path.join(tmpDir, "instrumental.mp3");
  const outputPath = path.join(tmpDir, "mixed.mp3");

  try {
    // Decode vocal base64
    const base64Data = vocalBase64.replace(/^data:audio\/[^;]+;base64,/, "");
    await writeFile(vocalPath, Buffer.from(base64Data, "base64"));

    // Get instrumental: from base64 or from URL
    if (instrumentalBase64) {
      const instB64 = instrumentalBase64.replace(/^data:audio\/[^;]+;base64,/, "");
      await writeFile(instrumentalPath, Buffer.from(instB64, "base64"));
    } else {
      console.log("Downloading instrumental from:", instrumentalUrl);
      const instRes = await fetch(instrumentalUrl, { redirect: "follow" });
      if (!instRes.ok) {
        console.error("Instrumental download failed:", instRes.status, instRes.statusText);
        throw new Error(`Failed to download instrumental: ${instRes.status}`);
      }
      const instBuffer = Buffer.from(await instRes.arrayBuffer());
      console.log("Instrumental downloaded:", instBuffer.length, "bytes");
      if (instBuffer.length < 1000) {
        throw new Error("Downloaded instrumental is too small, likely invalid");
      }
      await writeFile(instrumentalPath, instBuffer);
    }

    // Mix with FFmpeg:
    // - vocal at vocalVolume
    // - instrumental at instrumentalVolume
    // - Use shortest duration (vocal track length)
    // - amix with dropout_transition for smooth end
    await exec("ffmpeg", [
      "-y",
      "-i", vocalPath,
      "-i", instrumentalPath,
      "-filter_complex",
      `[0:a]volume=${vocalVolume}[v];[1:a]volume=${instrumentalVolume}[i];[v][i]amix=inputs=2:duration=shortest:dropout_transition=3`,
      "-ac", "2",
      "-ar", "44100",
      "-b:a", "192k",
      outputPath,
    ], { timeout: 30000 });

    const mixedData = await readFile(outputPath);

    // Cleanup
    await Promise.all([
      unlink(vocalPath).catch(() => {}),
      unlink(instrumentalPath).catch(() => {}),
      unlink(outputPath).catch(() => {}),
    ]);

    return new NextResponse(mixedData, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": 'attachment; filename="mixed-song.mp3"',
      },
    });
  } catch (error: unknown) {
    // Cleanup on error
    await Promise.all([
      unlink(vocalPath).catch(() => {}),
      unlink(instrumentalPath).catch(() => {}),
      unlink(outputPath).catch(() => {}),
    ]);

    console.error("Mix error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to mix audio",
      },
      { status: 500 }
    );
  }
}
