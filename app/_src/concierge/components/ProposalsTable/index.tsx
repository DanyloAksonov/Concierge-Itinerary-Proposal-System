import { StatusBadge } from "@/app/_src/common/components/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/_src/common/components/Table";
import { CATEGORIES } from "@/domain/proposals/categories";
import { formatDaySpan, formatMoney, formatTimestamp } from "@/lib/format";
import type { ProposalSummaryDto } from "@/domain/proposals/service";
import { ProposalRowActions } from "../ProposalRowActions";

type Props = {
  proposals: ProposalSummaryDto[];
  memberName: string;
  /** Audit timestamps are shown in the destination's time zone, where the concierge works. */
  timeZone: string;
  /** The draft currently open in the builder, highlighted in the list. */
  editingId: string | null;
};

const MILESTONES = [
  { key: "createdAt", label: "Created" },
  { key: "sentAt", label: "Sent" },
  { key: "approvedAt", label: "Approved" },
  { key: "paidAt", label: "Paid" },
] as const;

export function ProposalsTable({ proposals, memberName, timeZone, editingId }: Props) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Proposal</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Items</TableHead>
            <TableHead className="text-right">Total</TableHead>
            {MILESTONES.map((milestone) => (
              <TableHead key={milestone.key}>{milestone.label}</TableHead>
            ))}
            <TableHead>Prepared by</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {proposals.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="py-6 text-center text-muted-foreground">
                No proposals yet. Build one above and send it to {memberName}.
              </TableCell>
            </TableRow>
          ) : (
            proposals.map((proposal) => (
              <TableRow
                key={proposal.id}
                className={proposal.id === editingId ? "bg-accent hover:bg-accent" : undefined}
              >
                <TableCell className="max-w-72 whitespace-normal">
                  <span className="font-medium break-words">{proposal.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {proposal.firstDay && proposal.lastDay
                      ? `${formatDaySpan(proposal.firstDay, proposal.lastDay)} · `
                      : ""}
                    {proposal.categories.map((category) => CATEGORIES[category].label).join(" · ") ||
                      "No items yet"}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={proposal.status} />
                  {proposal.id === editingId && (
                    <span className="ml-2 text-xs font-medium">Editing</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{proposal.itemCount}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatMoney(proposal.totalCents)}
                </TableCell>
                {MILESTONES.map((milestone) => {
                  const at = proposal[milestone.key];
                  return (
                    <TableCell key={milestone.key} className="tabular-nums text-muted-foreground">
                      {at ? (
                        <time dateTime={at} className="text-foreground">
                          {formatTimestamp(at, timeZone)}
                        </time>
                      ) : (
                        <>
                          <span aria-hidden>—</span>
                          <span className="sr-only">Not yet</span>
                        </>
                      )}
                    </TableCell>
                  );
                })}
                <TableCell>{proposal.conciergeName}</TableCell>
                <TableCell>
                  <ProposalRowActions
                    proposalId={proposal.id}
                    status={proposal.status}
                    memberName={memberName}
                    isEditing={proposal.id === editingId}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
