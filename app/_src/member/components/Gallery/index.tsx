import Image from "next/image";
import bonfire from "@/public/images/bonfire.webp";
import dining from "@/public/images/dining.webp";
import heroVilla from "@/public/images/hero-villa.webp";
import sailing from "@/public/images/sailing.webp";
import spa from "@/public/images/spa.webp";

// AI-generated placeholders (see README "Assumptions"), described as they actually look.
const HERO = {
  src: heroVilla,
  alt: "A modern stone-and-timber villa with floor-to-ceiling glass and an infinity pool on a terrace above the beach, palm trees and curtained daybeds glowing at sunset",
};

const THUMBNAILS = [
  {
    src: dining,
    alt: "A candlelit table set for dinner on a terrace at dusk, with white linen, wildflowers and wine glasses beside the lit pool and the ocean",
  },
  {
    src: spa,
    alt: "An open-air wooden spa pavilion with white curtains around a massage table, surrounded by monstera leaves and palms",
  },
  {
    src: sailing,
    alt: "Aerial view of a white catamaran sailing over turquoise water and reefs, with a green headland and beachfront villas behind",
  },
  {
    src: bonfire,
    alt: "A bonfire on the beach at sunset, ringed by wooden lounge chairs with cushions, blankets and lanterns",
  },
];

/**
 * Hero (16:9, two thirds wide on desktop) plus four thumbnails. `sizes` mirrors the layout so a
 * phone downloads a phone-sized file: the content column is at most 1100px minus 48px padding.
 */
export function Gallery() {
  return (
    <div className="grid gap-2 pt-6 lg:grid-cols-[2fr_1fr]">
      <div className="relative aspect-video overflow-hidden rounded-sm bg-panel">
        <Image
          src={HERO.src}
          alt={HERO.alt}
          fill
          preload
          placeholder="blur"
          sizes="(min-width: 1100px) 700px, (min-width: 1024px) 64vw, 100vw"
          className="object-cover"
        />
      </div>
      <ul className="grid grid-cols-4 gap-2 lg:grid-cols-2 lg:grid-rows-2">
        {THUMBNAILS.map((photo) => (
          <li
            key={photo.src.src}
            className="relative aspect-square overflow-hidden rounded-sm bg-panel lg:aspect-auto"
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              placeholder="blur"
              sizes="(min-width: 1100px) 175px, (min-width: 1024px) 16vw, 25vw"
              className="object-cover"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
