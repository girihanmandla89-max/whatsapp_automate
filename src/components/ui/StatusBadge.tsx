import React from "react";

interface StatusBadgeProps {
  status: "CONNECTED" | "DISCONNECTED" | "RECONNECTING" | "ACTIVE" | "SUSPENDED" | "STANDBY" | "INITIALIZING" | "QR_READY";
  label?: string;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = "md",
}) => {
  const isGreen = status === "CONNECTED" || status === "ACTIVE";
  const isAmber = status === "RECONNECTING" || status === "STANDBY" || status === "INITIALIZING" || status === "QR_READY";
  const isRed = status === "DISCONNECTED" || status === "SUSPENDED";

  const colorStyles = isGreen
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
    : isAmber
    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
    : "bg-rose-500/10 text-rose-400 border-rose-500/30";

  const dotStyles = isGreen
    ? "bg-emerald-400 shadow-[0_0_8px_#10b981]"
    : isAmber
    ? "bg-amber-400 shadow-[0_0_8px_#f59e0b]"
    : "bg-rose-400 shadow-[0_0_8px_#f43f5e]";

  const sizeStyles = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-xs tracking-wider";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border font-medium uppercase transition-all ${colorStyles} ${sizeStyles}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyles} animate-pulse`} />
      {label || status}
    </span>
  );
};
