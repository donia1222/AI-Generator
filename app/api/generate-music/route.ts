import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

const KIE_GENERATE_URL = "https://api.kie.ai/api/v1/generate";
const KIE_COVER_URL = "https://api.kie.ai/api/v1/generate/upload-cover";
const KIE_POLL_URL = "https://api.kie.ai/api/v1/generate/record-info";

async function pollForResult(taskId: string, apiKey: string): Promise<{
  audioUrl: string;
  title: string;
  duration: number;
} | null> {
  const maxAttempts = 90;
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
  const { prompt, style, title, instrumental, instructions, vocal, uploadUrl, useAddInstrumental } = await req.json();

  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { status: "error", message: "KIE_API_KEY not configured" },
      { status: 500 }
    );
  }

  // Extract clean style tags (without "male vocals" / "female vocals")
  const cleanStyle = (style || "pop")
    .split(", ")
    .filter((t: string) => t && t !== "male vocals" && t !== "female vocals")
    .join(", ");

  let apiUrl: string;
  let body: Record<string, unknown>;

  if (useAddInstrumental && uploadUrl) {
    // UPLOAD-COVER + INSTRUMENTAL MODE:
    // Suno analyzes the uploaded audio (melody, rhythm, timing, structure)
    // and generates ONLY the instrumental that follows the exact same timing.
    // instrumental=true = no AI voice, only music/beat
    // customMode=true = Suno follows the audio structure precisely
    apiUrl = KIE_COVER_URL;

    body = {
      uploadUrl,
      model: "V5",
      customMode: true,
      instrumental: true,
      callBackUrl: "https://example.com/callback",
      style: cleanStyle || "pop",
      title: title || "Untitled",
      prompt: prompt
        ? `Instrumental ${cleanStyle} version. ${prompt}`.substring(0, 500)
        : `Instrumental ${cleanStyle} version that perfectly follows the melody, rhythm and timing of the uploaded audio`,
    };

    console.log("Upload-cover instrumental mode - uploadUrl:", uploadUrl, "style:", cleanStyle);
  } else {
    // Normal generation from text
    apiUrl = KIE_GENERATE_URL;
    const hasLyrics = (prompt || "").length > 0;
    const hasInstructions = (instructions || "").length > 0;

    if (hasLyrics) {
      // Custom mode: lyrics go clean in prompt (only section metatags like [Verse], [Chorus])
      // Style prompt controls ALL sonic direction: genre, instruments, sounds, mood, mix
      // Suno ignores production/sound cues inside lyrics - they MUST go in style field
      let fullStyle = cleanStyle;
      if (hasInstructions) {
        fullStyle = `${cleanStyle}, ${instructions}`.substring(0, 500);
      }

      body = {
        model: "V5",
        customMode: true,
        instrumental: !!instrumental,
        callBackUrl: "https://example.com/callback",
        prompt: prompt,
        style: fullStyle,
        title: title || "Untitled",
      };
    } else if (hasInstructions) {
      // No lyrics but has instructions: use instructions as the description
      body = {
        model: "V5",
        customMode: false,
        instrumental: !!instrumental,
        callBackUrl: "https://example.com/callback",
        prompt: `${cleanStyle}. ${instructions}`.substring(0, 500),
      };
    } else {
      // No lyrics, no instructions: generate from style only
      body = {
        model: "V5",
        customMode: false,
        instrumental: !!instrumental,
        callBackUrl: "https://example.com/callback",
        prompt: `A catchy ${cleanStyle} song with great melody and full arrangement`,
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
      console.error("Kie.ai create error:", JSON.stringify(createData));
      return NextResponse.json(
        {
          status: "error",
          message: createData.msg || createData.message || JSON.stringify(createData),
        },
        { status: 500 }
      );
    }

    const taskId = createData.data.taskId;
    console.log(`Kie.ai ${useAddInstrumental ? "add-instrumental" : "generate"} task created:`, taskId);

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
