import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const petDir = path.join(root, 'public', 'image', 'pet');
const outDir = path.join(petDir, 'cards');

/**
 * focusX / focusY: 0 = left/top, 0.5 = center, 1 = right/bottom of the usable image area
 * trimBottom: fraction of bottom height to shave off before cropping (removes corner watermarks cleanly)
 */
const SOURCES = [
	{ src: '20261125-153542.852-14.jpg', out: 'pidan-01-fluffy-onigiri.webp', focusX: 0.5, focusY: 0.34, trimBottom: 0.06 },
	{ src: '20261125-153542.852-2.jpg', out: 'pidan-02-sapphire-closeup.webp', focusX: 0.5, focusY: 0.45, trimBottom: 0.08 },
	{ src: '9e5a53286ad41363d696236c43b0538b.jpg', out: 'pidan-03-donut-collar.webp', focusX: 0.5, focusY: 0.36, trimBottom: 0 },
	{ src: '20261125-153542.852-4.jpg', out: 'pidan-04-cheek-poke.webp', focusX: 0.5, focusY: 0.48, trimBottom: 0.08 },
	{ src: '20261125-153542.852-13.jpg', out: 'pidan-05-playful-hunt.webp', focusX: 0.5, focusY: 0.5, trimBottom: 0.07 },
	{ src: '20261125-153542.852-8.jpg', out: 'pidan-06-boba-stare.webp', focusX: 0.5, focusY: 0.45, trimBottom: 0.08 },
	{ src: '04cfe4a26bdc7888faeb0c750d5a24b4.jpg', out: 'pidan-07-belly-flop.webp', focusX: 0.5, focusY: 0.55, trimBottom: 0 },
	{ src: '20261125-153542.852-9.jpg', out: 'pidan-08-majestic-mane.webp', focusX: 0.5, focusY: 0.2, trimBottom: 0.07 },
	{ src: '20261125-153542.852-12.jpg', out: 'pidan-09-squint-judge.webp', focusX: 0.5, focusY: 0.16, trimBottom: 0.05 },
	{ src: '20261125-153542.852-1.jpg', out: 'pidan-10-marshmallow-top.webp', focusX: 0.5, focusY: 0.72, trimBottom: 0.07 },
	{ src: '20261125-153542.852-6.jpg', out: 'pidan-11-sniff-cam.webp', focusX: 0.5, focusY: 0.26, trimBottom: 0 },
	{ src: '20261125-153542.852-7.jpg', out: 'pidan-12-toasted-loaf.webp', focusX: 0.5, focusY: 0.45, trimBottom: 0.07 },
	{ src: '20261128-113755.524-4.jpg', out: 'pidan-13-armchair-sun.webp', focusX: 0.5, focusY: 0.58, trimBottom: 0 },
	{ src: '20261128-113755.524-2.jpg', out: 'pidan-14-faceplant-nap.webp', focusX: 0.5, focusY: 0.46, trimBottom: 0 },
	{ src: '20261128-113755.524-3.jpg', out: 'pidan-15-bowl-wait.webp', focusX: 0.5, focusY: 0.34, trimBottom: 0 },
	{ src: '20261128-113755.524-5.jpg', out: 'pidan-16-bowl-feast.webp', focusX: 0.5, focusY: 0.6, trimBottom: 0 },
	{ src: '20261128-113755.524-6.jpg', out: 'pidan-17-sleepy-paws.webp', focusX: 0.52, focusY: 0.5, trimBottom: 0 },
	{ src: '20261128-113755.524-1.jpg', out: 'pidan-18-closeup-gaze.webp', focusX: 0.5, focusY: 0.56, trimBottom: 0 },
];

await fs.mkdir(outDir, { recursive: true });

for (const item of SOURCES) {
	const inputPath = path.join(petDir, item.src);
	const outputPath = path.join(outDir, item.out);

	const rotated = sharp(inputPath).rotate();
	const { width = 1000, height = 1000 } = await rotated.metadata();
	const usableHeight = Math.floor(height * (1 - item.trimBottom));
	const side = Math.min(width, usableHeight);
	const maxLeft = Math.max(0, width - side);
	const maxTop = Math.max(0, usableHeight - side);
	const left = Math.max(0, Math.min(maxLeft, Math.floor(maxLeft * (item.focusX ?? 0.5))));
	const top = Math.max(0, Math.min(maxTop, Math.floor(maxTop * (item.focusY ?? 0.5))));

	await sharp(inputPath)
		.rotate()
		.extract({ left, top, width: side, height: side })
		.resize(720, 720, { fit: 'cover' })
		.webp({ quality: 84, effort: 5 })
		.toFile(outputPath);

	const stat = await fs.stat(outputPath);
	console.log(`${item.out}: ${(stat.size / 1024).toFixed(1)} KB (${side}x${side} @ ${left},${top})`);
}
