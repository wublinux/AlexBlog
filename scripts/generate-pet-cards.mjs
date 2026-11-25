import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const petDir = path.join(root, 'public', 'image', 'pet');
const outDir = path.join(petDir, 'cards');

/**
 * focusY: 0 = top, 0.5 = center, 1 = bottom of the usable image area
 * trimBottom: fraction of bottom height to shave off before cropping (removes corner watermarks cleanly)
 */
const SOURCES = [
	{ src: '20261125-153542.852-14.jpg', out: 'pidan-01-fluffy-onigiri.webp', focusY: 0.34, trimBottom: 0.06 },
	{ src: '20261125-153542.852-2.jpg', out: 'pidan-02-sapphire-closeup.webp', focusY: 0.45, trimBottom: 0.08 },
	{ src: '9e5a53286ad41363d696236c43b0538b.jpg', out: 'pidan-03-donut-collar.webp', focusY: 0.36, trimBottom: 0 },
	{ src: '20261125-153542.852-4.jpg', out: 'pidan-04-cheek-poke.webp', focusY: 0.48, trimBottom: 0.08 },
	{ src: '20261125-153542.852-13.jpg', out: 'pidan-05-playful-hunt.webp', focusY: 0.5, trimBottom: 0.07 },
	{ src: '20261125-153542.852-8.jpg', out: 'pidan-06-boba-stare.webp', focusY: 0.45, trimBottom: 0.08 },
	{ src: '04cfe4a26bdc7888faeb0c750d5a24b4.jpg', out: 'pidan-07-belly-flop.webp', focusY: 0.55, trimBottom: 0 },
	{ src: '20261125-153542.852-9.jpg', out: 'pidan-08-majestic-mane.webp', focusY: 0.2, trimBottom: 0.07 },
	{ src: '20261125-153542.852-12.jpg', out: 'pidan-09-squint-judge.webp', focusY: 0.16, trimBottom: 0.05 },
	{ src: '20261125-153542.852-1.jpg', out: 'pidan-10-marshmallow-top.webp', focusY: 0.72, trimBottom: 0.07 },
	{ src: '20261125-153542.852-6.jpg', out: 'pidan-11-sniff-cam.webp', focusY: 0.26, trimBottom: 0 },
	{ src: '20261125-153542.852-7.jpg', out: 'pidan-12-toasted-loaf.webp', focusY: 0.45, trimBottom: 0.07 },
];

await fs.mkdir(outDir, { recursive: true });

for (const item of SOURCES) {
	const inputPath = path.join(petDir, item.src);
	const outputPath = path.join(outDir, item.out);

	const rotated = sharp(inputPath).rotate();
	const { width = 1000, height = 1000 } = await rotated.metadata();
	const usableHeight = Math.floor(height * (1 - item.trimBottom));
	const side = Math.min(width, usableHeight);
	const left = Math.max(0, Math.floor((width - side) / 2));
	const maxTop = Math.max(0, usableHeight - side);
	const top = Math.max(0, Math.min(maxTop, Math.floor(maxTop * item.focusY)));

	await sharp(inputPath)
		.rotate()
		.extract({ left, top, width: side, height: side })
		.resize(720, 720, { fit: 'cover' })
		.webp({ quality: 84, effort: 5 })
		.toFile(outputPath);

	const stat = await fs.stat(outputPath);
	console.log(`${item.out}: ${(stat.size / 1024).toFixed(1)} KB (${side}x${side} @ ${left},${top})`);
}
