import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

const KIE_GENERATE_URL = "https://api.kie.ai/api/v1/generate";
const KIE_COVER_URL = "https://api.kie.ai/api/v1/generate/upload-cover";
const KIE_ADD_INSTRUMENTAL_URL = "https://api.kie.ai/api/v1/generate/add-instrumental";
const KIE_POLL_URL = "https://api.kie.ai/api/v1/generate/record-info";

async function pollForResult(taskId: string, apiKey: string): Promise<{
  audioUrl: string;
  title: string;
  duration: number;
} | null> {
  const maxAttempts = 60;
  const interval = 3000;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, interval));

    const res = await fetch(`${KIE_POLL_URL}?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) continue;

    const json = await res.json();
    const status = json?.data?.status;

    if (status === "SUCCESS") {
      const tracks = json.data.response?.sunoData;
      if (tracks && tracks.length > 0 && tracks[0].duration > 0) {
        return {
          audioUrl: tracks[0].audioUrl,
          title: tracks[0].title || "KI-Song",
          duration: tracks[0].duration,
        };
      }
    }

    if (
      status === "CREATE_TASK_FAILED" ||
      status === "GENERATE_AUDIO_FAILED" ||
      status === "SENSITIVE_WORD_ERROR"
    ) {
      throw new Error(
        json.data.errorMessage || `Generation failed with status: ${status}`
      );
    }
  }

  throw new Error("Generation timed out after 3 minutes");
}

export async function POST(req: NextRequest) {
  const { prompt, style, title, instrumental, lyrics, vocal } = await req.json();

  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { status: "error", message: "KIE_API_KEY not configured" },
      { status: 500 }
    );
  }

  // If lyrics are provided (from Whisper transcription), generate instrumental
  // that matches those lyrics structure
  const hasTranscribedLyrics = !!lyrics;
  const apiUrl = KIE_GENERATE_URL;
  let body: Record<string, unknown>;

  // Extract clean style tags (without "male vocals" / "female vocals")
  const cleanStyle = (style || "pop")
    .split(", ")
    .filter((t: string) => t && t !== "male vocals" && t !== "female vocals")
    .join(", ");

  if (hasTranscribedLyrics) {
    // Upload mode WITH lyrics: use transcribed lyrics to generate ONLY instrumental
    // customMode=true so Suno follows the lyrics structure for timing
    // instrumental=true so NO voice is generated, only music
    body = {
      model: "V5",
      customMode: true,
      instrumental: true,
      callBackUrl: "https://example.com/callback",
      prompt: lyrics,
      style: cleanStyle,
      title: title || "Untitled",
    };

    console.log("Upload mode - generating instrumental from transcribed lyrics:", lyrics.substring(0, 100));
  } else if (instrumental && !prompt?.trim()) {
    // Upload mode WITHOUT lyrics (Whisper failed): generate instrumental from style only
    body = {
      model: "V5",
      customMode: false,
      instrumental: true,
      callBackUrl: "https://example.com/callback",
      prompt: `A ${cleanStyle} instrumental backing track with great melody and full arrangement`,
    };

    console.log("Upload mode - generating instrumental from style only:", cleanStyle);
  } else {
    // Normal generation from text
    const hasLongPrompt = (prompt || "").length > 100;

    if (hasLongPrompt) {
      // Long text = custom mode (prompt as lyrics, up to 5000 chars)
      body = {
        model: "V5",
        customMode: true,
        instrumental: !!instrumental,
        callBackUrl: "https://example.com/callback",
        prompt: prompt,
        style: cleanStyle,
        title: title || "Untitled",
      };
    } else {
      // Short text = non-custom mode (prompt as description, Suno generates full lyrics)
      body = {
        model: "V5",
        customMode: false,
        instrumental: !!instrumental,
        callBackUrl: "https://example.com/callback",
        prompt: prompt
          ? `${cleanStyle}. ${prompt}`.substring(0, 500)
          : `A catchy ${cleanStyle} song with great melody and full arrangement`,
      };
    }

    // Set vocal gender
    if (vocal === "male") body.vocalGender = "m";
    if (vocal === "female") body.vocalGender = "f";
  }

  console.log("Kie.ai request:", apiUrl, JSON.stringify(body, null, 2));

  try {
    const createRes = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const createData = await createRes.json();

    if (createData.code !== 200 || !createData.data?.taskId) {
      return NextResponse.json(
        {
          status: "error",
          message: createData.msg || "Failed to create music generation task",
        },
        { status: createRes.status || 500 }
      );
    }

    const taskId = createData.data.taskId;
    console.log(`Kie.ai ${hasTranscribedLyrics ? "instrumental-from-lyrics" : "generate"} task created:`, taskId);

    const result = await pollForResult(taskId, apiKey);

    if (!result) {
      return NextResponse.json(
        { status: "error", message: "No audio was generated" },
        { status: 500 }
      );
    }

    console.log("Kie.ai generation complete:", result.title, result.duration + "s");

    return NextResponse.json({
      status: "success",
      audioUrl: result.audioUrl,
      title: result.title,
      duration: Math.round(result.duration),
    });
  } catch (error: unknown) {
    console.error("Music generation error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to generate music",
      },
      { status: 500 }
    );
  }
}
