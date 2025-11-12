import * as React from "react";

export interface ProgressBarProps {
  value: number; // 0-100
  color: "green" | "yellow" | "red";
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, color, label }) => {
  const barColor =
    color === "green"
      ? "bg-green-500"
      : color === "yellow"
      ? "bg-yellow-400"
      : "bg-red-500";
  return (
    <div className="w-full">
      {label && <div className="mb-1 text-sm font-medium text-gray-700">{label}</div>}
      <div className="w-full bg-gray-200 rounded-full h-4" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={`h-4 rounded-full transition-all duration-500 ease-in-out ${barColor}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
};
