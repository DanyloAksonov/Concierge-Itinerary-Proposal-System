"use client";

import { type FormEvent, useId, useRef, useState } from "react";
import { Button } from "@/app/_src/common/components/Button";
import { Input } from "@/app/_src/common/components/Input";
import { Label } from "@/app/_src/common/components/Label";
import { formatShortDay, parseDollarsToCents } from "@/lib/format";
import { CATEGORIES, ItemCategory } from "@/domain/proposals/categories";
import { type ItemInput, itemInputSchema } from "@/domain/proposals/validation";
import { cn } from "cn";

type Field = "category" | "title" | "time" | "price" | "description";
type FieldErrors = Partial<Record<Field, string>>;

// Where each schema field's error is shown in this form.
const SCHEMA_FIELD: Record<string, Field> = {
  category: "category",
  title: "title",
  scheduledAt: "time",
  priceCents: "price",
  description: "description",
};

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
  const [category, setCategory] = useState<ItemCategory | "">("");
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(days[0]);
  const [time, setTime] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const titleRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FieldErrors = {};
    if (!category) nextErrors.category = "Choose a category.";
    if (!time) nextErrors.time = "Choose a time.";
    const priceCents = parseDollarsToCents(price);
    if (priceCents === null) nextErrors.price = "Enter a price in dollars, like 1250 or 1,250.50.";

    const result = itemInputSchema.safeParse({
      category,
      title,
      description,
      scheduledAt: `${day}T${time}`,
      priceCents,
    });
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = SCHEMA_FIELD[String(issue.path[0])];
        if (field && !nextErrors[field]) nextErrors[field] = issue.message;
      }
    }

    setErrors(nextErrors);
    if (!result.success || Object.keys(nextErrors).length > 0) return;

    onAdd(result.data);
    setTitle("");
    setTime("");
    setPrice("");
    setDescription("");
    titleRef.current?.focus();
  }

  const errorId = (field: Field) => `${id}-${field}-error`;
  const fieldProps = (field: Field) => ({
    id: `${id}-${field}`,
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? errorId(field) : undefined,
  });
  const errorList = (Object.keys(errors) as Field[]).filter((field) => errors[field]);
  const suggestions = category ? CATEGORIES[category].suggestions : [];

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[10rem_minmax(0,1fr)_9rem_7rem_8rem_auto] md:items-end">
        <div className="grid gap-1">
          <Label htmlFor={`${id}-category`}>Category</Label>
          <select
            {...fieldProps("category")}
            value={category}
            onChange={(event) => setCategory(event.target.value as ItemCategory | "")}
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

        <div className="col-span-2 grid gap-1 md:col-span-1">
          <Label htmlFor={`${id}-title`}>Title</Label>
          <Input
            {...fieldProps("title")}
            ref={titleRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
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
          <select
            id={`${id}-day`}
            value={day}
            onChange={(event) => setDay(event.target.value)}
            className={SELECT_CLASS}
          >
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
          <Input
            {...fieldProps("time")}
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
          />
        </div>

        <div className="grid gap-1">
          <Label htmlFor={`${id}-price`}>Price (USD)</Label>
          <Input
            {...fieldProps("price")}
            inputMode="decimal"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="0.00"
          />
        </div>

        <Button type="submit" className="col-span-2 md:col-span-1">
          Add item
        </Button>
      </div>

      <div className="grid gap-1">
        <Label htmlFor={`${id}-description`} className="font-normal text-muted-foreground">
          Description (optional)
        </Label>
        <Input
          {...fieldProps("description")}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What's included, where to meet, what to bring"
          maxLength={1000}
        />
      </div>

      {errorList.length > 0 && (
        <ul className="grid gap-0.5 text-sm text-destructive">
          {errorList.map((field) => (
            <li key={field} id={errorId(field)}>
              {errors[field]}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
