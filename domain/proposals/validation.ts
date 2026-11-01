import { z } from "zod";
import { ItemCategory } from "./categories";
import { ProposalStatus } from "./status";

const LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

// Rejects well-formed but impossible values such as 2027-02-30T10:00 or 24:00.
function isRealDateTime(value: string): boolean {
  const date = new Date(`${value}:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

const MAX_PRICE_CENTS = 100_000_000; // $1,000,000 per item — guards against typos, not a business rule
const MAX_ITEMS = 50;

export const itemInputSchema = z.strictObject({
  category: z.enum(ItemCategory),
  title: z.string().trim().min(1, "Enter a title.").max(120),
  description: z.string().trim().max(1000).default(""),
  scheduledAt: z
    .string()
    .regex(LOCAL_DATE_TIME, "Use local date-time format YYYY-MM-DDTHH:mm")
    .refine(isRealDateTime, "Not a real date/time"),
  priceCents: z
    .number()
    .int("Price must be a whole number of cents")
    .min(0, "Price cannot be negative")
    .max(MAX_PRICE_CENTS),
});

// An empty note means "no note".
const noteSchema = z
  .string()
  .trim()
  .max(2000)
  .nullable()
  .transform((note) => note || null);

const itemsSchema = z.array(itemInputSchema).max(MAX_ITEMS);

export const proposalTitleSchema = z.string().trim().min(1, "Enter a proposal title.").max(120);

export const createProposalSchema = z.strictObject({
  reservationId: z.number().int().positive(),
  title: proposalTitleSchema,
  note: noteSchema.optional(),
  items: itemsSchema.default([]),
});

/** PATCH is either a status change or a draft content edit — never both in one request. */
export const updateProposalSchema = z
  .strictObject({
    status: z.enum(ProposalStatus).optional(),
    title: proposalTitleSchema.optional(),
    note: noteSchema.optional(),
    items: itemsSchema.optional(),
  })
  .superRefine((body, ctx) => {
    const editsContent =
      body.title !== undefined || body.note !== undefined || body.items !== undefined;
    if (body.status && editsContent) {
      ctx.addIssue({
        code: "custom",
        message: "Send either `status` or `title`/`note`/`items`, not both",
      });
    }
    if (!body.status && !editsContent) {
      ctx.addIssue({
        code: "custom",
        message: "Nothing to update: provide `status`, `title`, `note` or `items`",
      });
    }
  });

export type ItemInput = z.infer<typeof itemInputSchema>;
export type CreateProposalInput = z.infer<typeof createProposalSchema>;
export type DraftChanges = { title?: string; note?: string | null; items?: ItemInput[] };
