"use client";

import { X } from "lucide-react";
import { Button } from "@/app/_src/common/components/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/_src/common/components/Table";
import { formatClockTime, formatMoney, formatShortDay } from "@/lib/format";
import { CATEGORIES } from "@/domain/proposals/categories";
import { totalCents } from "@/domain/proposals/rules";
import type { ItemInput } from "@/domain/proposals/validation";

export type DraftItem = ItemInput & { key: string };

type Props = { items: DraftItem[]; onRemove: (key: string) => void };

/** The items added so far, in time order, with the running total in the footer. */
export function ItemList({ items, onRemove }: Props) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Day</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Remove</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                No items yet. Add the first one above.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.key}>
                <TableCell className="tabular-nums">
                  {formatShortDay(item.scheduledAt.slice(0, 10))}
                </TableCell>
                <TableCell className="tabular-nums">{formatClockTime(item.scheduledAt)}</TableCell>
                <TableCell>{CATEGORIES[item.category].label}</TableCell>
                <TableCell className="max-w-72 whitespace-normal">
                  <span className="font-medium break-words">{item.title}</span>
                  {item.description && (
                    <span className="block text-xs text-muted-foreground break-words">
                      {item.description}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(item.priceCents)}</TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRemove(item.key)}
                    aria-label={`Remove ${item.title}`}
                  >
                    <X aria-hidden />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4} className="text-right">
              Total
            </TableCell>
            <TableCell className="text-right tabular-nums">
              <output aria-live="polite">{formatMoney(totalCents(items))}</output>
            </TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
