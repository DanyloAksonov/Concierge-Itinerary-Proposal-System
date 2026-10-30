import { ItemCategory } from "@/lib/generated/prisma/enums";

export { ItemCategory };

type CategoryConfig = { label: string; suggestions: readonly string[] };

// Category ids live in the Prisma enum; display config is static product copy, not DB data.
export const CATEGORIES: Record<ItemCategory, CategoryConfig> = {
  DINING: { label: "Dining", suggestions: ["Private chef dinner", "Restaurant reservation"] },
  ACTIVITIES: { label: "Activities", suggestions: ["Surf lesson", "Snorkeling", "ATV tour"] },
  WELLNESS: { label: "Wellness", suggestions: ["Spa treatment", "Yoga session", "Massage"] },
  EXCURSIONS: {
    label: "Excursions",
    suggestions: ["Whale watching", "Sailing charter", "Cultural tour"],
  },
  TRANSPORT: {
    label: "Transport",
    suggestions: ["Airport transfer", "Private car", "Helicopter"],
  },
  EXPERIENCES: {
    label: "Experiences",
    suggestions: ["Sunset cocktails", "Bonfire on the beach", "Tequila tasting"],
  },
};
