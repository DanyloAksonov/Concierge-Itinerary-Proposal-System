"use client";

import { ChevronRight } from "lucide-react";
import { type MouseEvent, type ReactNode, useId, useState } from "react";
import { TableCell, TableRow } from "@/app/_src/common/components/Table";
import { cn } from "cn";

type Props = {
  title: string;
  /** One short line under the title, e.g. "Mar 17 – 19". */
  summary: string;
  /** The rest of the row's cells, rendered on the server. */
  cells: ReactNode;
  /** What the row expands to show, rendered on the server. */
  details: ReactNode;
  /** Number of columns, so the details row spans the whole table. */
  columnCount: number;
  className?: string;
};

/**
 * A proposals-table row that expands to show its items. The title is a real disclosure button
 * (keyboard, screen readers); a click anywhere else on the row toggles too, except on the row's own
 * links and buttons (Edit, Send, Copy, Open).
 */
export function ExpandableProposalRow({ title, summary, cells, details, columnCount, className }: Props) {
  const detailsId = useId();
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((current) => !current);

  function handleRowClick(event: MouseEvent<HTMLTableRowElement>) {
    if ((event.target as HTMLElement).closest("a, button")) return;
    toggle();
  }

  return (
    <>
      <TableRow onClick={handleRowClick} className={cn("cursor-pointer", className)}>
        <TableCell className="min-w-44 max-w-72 whitespace-normal">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={toggle}
            className="flex items-start gap-1 rounded-sm text-left font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <ChevronRight
              aria-hidden
              className={cn(
                "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
                open && "rotate-90",
              )}
            />
            <span className="break-words">{title}</span>
          </button>
          <span className="block whitespace-nowrap pl-5 text-xs text-muted-foreground">{summary}</span>
        </TableCell>
        {cells}
      </TableRow>
      <TableRow id={detailsId} hidden={!open} className="bg-muted/50 hover:bg-muted/50">
        <TableCell colSpan={columnCount} className="whitespace-normal p-0">
          {details}
        </TableCell>
      </TableRow>
    </>
  );
}
