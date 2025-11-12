import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color: "green" | "yellow" | "red";
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ color, children, className, ...props }) => {
  const colorClass =
    color === "green"
      ? "bg-green-100 text-green-800 border-green-400"
      : color === "yellow"
      ? "bg-yellow-100 text-yellow-800 border-yellow-400"
      : "bg-red-100 text-red-800 border-red-400";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold mr-2",
        colorClass,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
