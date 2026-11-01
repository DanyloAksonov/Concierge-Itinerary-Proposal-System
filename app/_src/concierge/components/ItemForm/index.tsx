"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/app/_src/common/components/Button";
import { Input } from "@/app/_src/common/components/Input";
import { Label } from "@/app/_src/common/components/Label";
import { CATEGORIES, ItemCategory } from "@/domain/proposals/categories";
import { type ItemInput, itemInputSchema } from "@/domain/proposals/validation";
import { formatShortDay, parseDollarsToCents } from "@/lib/format";
import { cn } from "cn";

/**
 * What the form edits (strings, as typed) and how it becomes an ItemInput. Title, description and
 * price limits come from the domain schema, so the form and the API can't disagree. Each field is
 * checked on its own so every error shows at once.
 */
const itemFormSchema = z
  .object({
    category: z
      .enum(ItemCategory)
      .or(z.literal(""))
      .refine((category) => category !== "", "Choose a category."),
    title: itemInputSchema.shape.title,
    day: z.string(),
    time: z.string().min(1, "Choose a time."),
    price: z
      .string()
      .refine((price) => parseDollarsToCents(price) !== null, "Enter a price in dollars, like 1250 or 1,250.50.")
      .refine(
        // Same limit as the API; only checked once the format is valid.
        (price) => itemInputSchema.shape.priceCents.safeParse(parseDollarsToCents(price) ?? 0).success,
        "A single item can be at most $1,000,000.",
      ),
    description: itemInputSchema.shape.description,
  })
  .transform(
    ({ category, day, time, price, ...rest }): ItemInput => ({
      ...rest,
      category: category as ItemCategory, // "" is rejected by the refine above
      scheduledAt: `${day}T${time}`,
      priceCents: parseDollarsToCents(price)!, // validated above
    }),
  );

type ItemFormValues = z.input<typeof itemFormSchema>;

// Fields in on-screen order: errors are listed in this order. react-hook-form focuses the first
// invalid field in registration order, which is the same.
const FIELDS = ["category", "title", "time", "price", "description"] as const;
type Field = (typeof FIELDS)[number];

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none aria-invalid:border-destructive md:text-sm";

type Props = {
  /** Stay days (YYYY-MM-DD) — the only days an item can be scheduled on. */
  days: string[];
  onAdd: (item: ItemInput) => void;
};

/** One-row entry form: fill the fields left to right, press Enter or "Add item". */
export function ItemForm({ days, onAdd }: Props) {
  const id = useId();
  const {
    register,
    handleSubmit,
    resetField,
    control,
    formState: { errors },
  } = useForm<ItemFormValues, unknown, ItemInput>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: { category: "", title: "", day: days[0], time: "", price: "", description: "" },
  });
  const category = useWatch({ control, name: "category" });

  const addItem = handleSubmit((item) => {
    onAdd(item);
    // Clear only the per-item fields; category and day stay, since the next item is often of the
    // same kind or on the same day.
    for (const field of ["title", "time", "price", "description"] as const) resetField(field);
    // Focus synchronously: react-hook-form's setFocus lands a tick later, which races with fast
    // typing (the next keystrokes would still go to Price).
    document.getElementById(`${id}-title`)?.focus();
  });

  const errorId = (field: Field) => `${id}-${field}-error`;
  const fieldProps = (field: Field) => ({
    id: `${id}-${field}`,
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? errorId(field) : undefined,
  });
  const errorList = FIELDS.filter((field) => errors[field]);
  const suggestions = category ? CATEGORIES[category].suggestions : [];

  return (
    <form onSubmit={addItem} noValidate className="grid gap-3">
      {/* One row only from lg: its fixed columns need ~700px, so at md the title field collapsed to 0. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[10rem_minmax(0,1fr)_9rem_7rem_8rem_auto] lg:items-end">
        <div className="grid gap-1">
          <Label htmlFor={`${id}-category`}>Category</Label>
          <select
            {...register("category")}
            {...fieldProps("category")}
            className={cn(SELECT_CLASS, !category && "text-muted-foreground")}
          >
            <option value="">Select…</option>
            {(Object.keys(CATEGORIES) as ItemCategory[]).map((key) => (
              <option key={key} value={key}>
                {CATEGORIES[key].label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2 grid gap-1 lg:col-span-1">
          <Label htmlFor={`${id}-title`}>Title</Label>
          <Input
            {...register("title")}
            {...fieldProps("title")}
            list={`${id}-suggestions`}
            placeholder={suggestions[0] ?? "Choose a category for suggestions"}
            maxLength={120}
            autoComplete="off"
          />
          <datalist id={`${id}-suggestions`}>
            {suggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        </div>

        <div className="grid gap-1">
          <Label htmlFor={`${id}-day`}>Day</Label>
          <select {...register("day")} id={`${id}-day`} className={SELECT_CLASS}>
            {days.map((stayDay, index) => (
              <option key={stayDay} value={stayDay}>
                {formatShortDay(stayDay)}
                {index === 0 ? " (arr.)" : index === days.length - 1 ? " (dep.)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1">
          <Label htmlFor={`${id}-time`}>Time (local)</Label>
          <Input {...register("time")} {...fieldProps("time")} type="time" />
        </div>

        <div className="grid gap-1">
          <Label htmlFor={`${id}-price`}>Price (USD)</Label>
          <Input {...register("price")} {...fieldProps("price")} inputMode="decimal" placeholder="0.00" />
        </div>

        <Button type="submit" className="col-span-2 lg:col-span-1">
          Add item
        </Button>
      </div>

      <div className="grid gap-1">
        <Label htmlFor={`${id}-description`} className="font-normal text-muted-foreground">
          Description (optional)
        </Label>
        <Input
          {...register("description")}
          {...fieldProps("description")}
          placeholder="What's included, where to meet, what to bring"
          maxLength={1000}
        />
      </div>

      {errorList.length > 0 && (
        <ul className="grid gap-0.5 text-sm text-destructive">
          {errorList.map((field) => (
            <li key={field} id={errorId(field)}>
              {errors[field]?.message}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
