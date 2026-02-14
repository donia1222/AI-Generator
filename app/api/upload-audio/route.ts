import { NextRequest, NextResponse } from "next/server";

const UPLOAD_URL = "https://kieai.redpandaai.co/api/file-base64-upload";

export async function POST(req: NextRequest) {
  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { status: "error", message: "KIE_API_KEY not configured" },
      { status: 500 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { status: "error", message: "No file provided" },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mimeType = file.type || "audio/mpeg";
  const base64Data = `data:${mimeType};base64,${base64}`;

  try {
    const res = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        base64Data,
        uploadPath: "audio/uploads",
        fileName: file.name,
      }),
    });

    const data = await res.json();
    console.log("Kie.ai upload response:", JSON.stringify(data));

    if ((data.code === 200 || data.success) && data.data?.downloadUrl) {
      console.log("Upload success - downloadUrl:", data.data.downloadUrl);
      return NextResponse.json({
        status: "success",
        url: data.data.downloadUrl,
        fileName: data.data.fileName,
      });
    }

    console.error("Upload failed:", JSON.stringify(data));
    return NextResponse.json(
      { status: "error", message: data.msg || "Upload failed" },
      { status: 500 }
    );
  } catch (error: unknown) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 }
    );
  }
}
