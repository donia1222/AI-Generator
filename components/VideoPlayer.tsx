"use client";

interface VideoPlayerProps {
  url: string;
  orientation?: "landscape" | "portrait";
}

export default function VideoPlayer({ url, orientation = "landscape" }: VideoPlayerProps) {
  const isPortrait = orientation === "portrait";

  return (
    <div
      className={`relative rounded-[20px] overflow-hidden bg-black border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.12)] mx-auto ${
        isPortrait ? "max-w-[360px]" : "w-full"
      }`}
      style={{ aspectRatio: isPortrait ? "9/16" : "16/9" }}
    >
      <video
        src={url}
        controls
        autoPlay
        loop
        className="w-full h-full object-contain"
      />
    </div>
  );
}
