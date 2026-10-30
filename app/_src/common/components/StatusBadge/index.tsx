import type { ProposalStatus } from "@/domain/proposals/status";
import { cn } from "cn";

// Text/background pairs are all ≥ 4.5:1 so the label stays readable at badge size.
const STATUS_STYLES: Record<ProposalStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "border-border bg-panel text-muted-foreground" },
  sent: { label: "Sent", className: "border-[#c9d7e8] bg-[#eef3f9] text-[#24527a]" },
  approved: { label: "Approved", className: "border-[#e6d6b5] bg-[#f8f2e6] text-[#6e5427]" },
  paid: { label: "Paid", className: "border-[#c4e0cd] bg-[#ebf5ee] text-[#21582f]" },
};

export function StatusBadge({ status, className }: { status: ProposalStatus; className?: string }) {
  const { label, className: tone } = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}
