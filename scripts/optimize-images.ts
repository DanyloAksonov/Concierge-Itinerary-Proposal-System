/**
 * Converts source images in public/images (PNG/JPEG) to resized WebP and deletes the originals.
 * Usage: drop new originals into public/images, then `npm run images:optimize`.
 */
import { readdir, rm } from "node:fs/promises";
import { extname, join } from "node:path";
import sharp from "sharp";

const DIR = "public/images";
const SOURCE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);

// Full-width images need more pixels than the gallery thumbnails.
const MAX_WIDTH: Record<string, number> = { "hero-villa": 2000, confirmation: 2000 };
const DEFAULT_MAX_WIDTH = 1200;
const QUALITY = 80;

async function main() {
  const sources = (await readdir(DIR)).filter((file) =>
    SOURCE_EXTENSIONS.has(extname(file).toLowerCase()),
  );
  if (sources.length === 0) {
    console.log(`[images] nothing to convert in ${DIR}`);
    return;
  }

  for (const file of sources) {
    // Trimmed so a stray space in a file name doesn't end up in the URL.
    const name = file.slice(0, -extname(file).length).trim();
    const width = MAX_WIDTH[name] ?? DEFAULT_MAX_WIDTH;
    const output = join(DIR, `${name}.webp`);

    const info = await sharp(join(DIR, file))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(output);
    await rm(join(DIR, file));
    console.log(`[images] ${file} → ${output} (${info.width}×${info.height}, ${Math.round(info.size / 1024)} KB)`);
  }
}

main();
