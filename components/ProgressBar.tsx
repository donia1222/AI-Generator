"use client";

interface ProgressBarProps {
  isActive: boolean;
  percent: number;
  text: string;
}

export default function ProgressBar({ isActive, percent, text }: ProgressBarProps) {
  if (!isActive) return null;

  return (
    <div className="max-w-[640px] mx-auto mt-6">
      <div className="flex justify-between items-center mb-2.5 text-sm font-semibold text-gunpowder-600">
        <span>{text}</span>
        <span>{percent}%</span>
      </div>
      <div className="w-full h-2 bg-gunpowder-150 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-400 ease-out"
          style={{
            width: `${percent}%`,
            background: "linear-gradient(90deg, var(--begonia400), var(--cerulean400))",
          }}
        />
      </div>
    </div>
  );
}
