import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imageDir = path.join(root, 'public', 'image');
const avatarPath = path.join(imageDir, 'favicon-512.png');
const outputPath = path.join(imageDir, 'og-default.png');
const heroOutputPath = path.join(imageDir, 'home-hero-anime.webp');

const background = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
	<defs>
		<linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#fdf7fb"/>
			<stop offset="0.48" stop-color="#e8f4ff"/>
			<stop offset="1" stop-color="#eadfff"/>
		</linearGradient>
		<radialGradient id="glow" cx="0.17" cy="0.2" r="0.72">
			<stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/>
			<stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
		</radialGradient>
		<filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
			<feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#6d5b8d" flood-opacity="0.22"/>
		</filter>
	</defs>
	<rect width="1200" height="630" rx="0" fill="url(#sky)"/>
	<rect width="1200" height="630" fill="url(#glow)"/>
	<path d="M0 490 C180 430 290 540 455 475 S770 430 930 505 S1110 475 1200 450 V630 H0Z" fill="#ffffff" fill-opacity="0.58"/>
	<path d="M0 535 C190 485 315 570 500 520 S810 490 1010 545 S1140 520 1200 500 V630 H0Z" fill="#ffd9e6" fill-opacity="0.48"/>
	<g fill="#f8a9c2" opacity="0.64">
		<ellipse cx="92" cy="95" rx="10" ry="5" transform="rotate(-26 92 95)"/>
		<ellipse cx="160" cy="170" rx="8" ry="4" transform="rotate(22 160 170)"/>
		<ellipse cx="522" cy="80" rx="9" ry="4" transform="rotate(-18 522 80)"/>
		<ellipse cx="1110" cy="115" rx="10" ry="5" transform="rotate(30 1110 115)"/>
		<ellipse cx="1040" cy="480" rx="8" ry="4" transform="rotate(-35 1040 480)"/>
	</g>
	<g transform="translate(72 116)">
		<text x="0" y="44" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="600" letter-spacing="5" fill="#9a7892">TECH · NOTES · LIFE</text>
		<text x="0" y="178" font-family="Georgia, 'Times New Roman', serif" font-size="94" font-weight="600" fill="#292536">Alex’s</text>
		<text x="0" y="268" font-family="Georgia, 'Times New Roman', serif" font-size="94" font-style="italic" fill="#6e6280">Blog</text>
		<text x="4" y="334" font-family="Inter, Arial, sans-serif" font-size="27" fill="#6f6879">Building, learning, and documenting the journey.</text>
		<rect x="4" y="372" width="346" height="52" rx="26" fill="#ffffff" fill-opacity="0.7" stroke="#dcb9cd"/>
		<text x="30" y="407" font-family="Inter, Arial, sans-serif" font-size="21" font-weight="600" fill="#755d72">letsgogogogogo.pp.ua</text>
	</g>
	<circle cx="950" cy="305" r="188" fill="#ffffff" fill-opacity="0.66" stroke="#ffffff" stroke-width="12" filter="url(#shadow)"/>
	<circle cx="950" cy="305" r="178" fill="none" stroke="#d59ab6" stroke-width="3"/>
	<circle cx="950" cy="305" r="166" fill="none" stroke="#9dbfe0" stroke-width="2" stroke-dasharray="7 12"/>
</svg>`);

const avatar = await sharp(avatarPath).resize(314, 314, { fit: 'cover' }).png().toBuffer();

await sharp(background)
	.composite([{ input: avatar, left: 793, top: 148 }])
	.png({ compressionLevel: 9, palette: true })
	.toFile(outputPath);

const heroBackground = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
	<defs>
		<linearGradient id="room" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#fff9fc"/>
			<stop offset="0.5" stop-color="#e6f4ff"/>
			<stop offset="1" stop-color="#e8ddfb"/>
		</linearGradient>
		<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#83c9f4"/>
			<stop offset="1" stop-color="#e4f5ff"/>
		</linearGradient>
		<filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
			<feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#7a6594" flood-opacity="0.2"/>
		</filter>
	</defs>
	<rect width="1600" height="900" fill="url(#room)"/>
	<rect x="92" y="72" width="920" height="610" rx="36" fill="#fff" fill-opacity="0.72" filter="url(#soft)"/>
	<rect x="126" y="106" width="852" height="542" rx="20" fill="url(#sky)"/>
	<path d="M126 522 L260 418 L358 492 L480 360 L645 510 L760 410 L978 548 V648 H126Z" fill="#8fb3c9" fill-opacity="0.38"/>
	<path d="M126 566 C270 520 360 576 492 540 S710 510 820 560 S930 535 978 520 V648 H126Z" fill="#f9d5e3" fill-opacity="0.72"/>
	<path d="M552 106 V648 M126 360 H978" stroke="#ffffff" stroke-width="18" stroke-opacity="0.82"/>
	<rect x="0" y="684" width="1600" height="216" fill="#f3d9d1"/>
	<path d="M0 714 C250 650 470 770 710 708 S1150 650 1600 742 V900 H0Z" fill="#f9ece8"/>
	<g fill="#f293b2" opacity="0.74">
		<ellipse cx="164" cy="150" rx="16" ry="7" transform="rotate(-30 164 150)"/>
		<ellipse cx="324" cy="244" rx="13" ry="6" transform="rotate(25 324 244)"/>
		<ellipse cx="712" cy="160" rx="15" ry="7" transform="rotate(-12 712 160)"/>
		<ellipse cx="900" cy="270" rx="12" ry="6" transform="rotate(32 900 270)"/>
		<ellipse cx="1110" cy="100" rx="16" ry="7" transform="rotate(-25 1110 100)"/>
		<ellipse cx="1490" cy="250" rx="14" ry="6" transform="rotate(18 1490 250)"/>
		<ellipse cx="1260" cy="700" rx="12" ry="6" transform="rotate(-34 1260 700)"/>
	</g>
	<circle cx="1260" cy="408" r="272" fill="#ffffff" fill-opacity="0.8" stroke="#ffffff" stroke-width="18" filter="url(#soft)"/>
	<circle cx="1260" cy="408" r="258" fill="none" stroke="#e39ab7" stroke-width="5"/>
	<circle cx="1260" cy="408" r="242" fill="none" stroke="#83bce2" stroke-width="3" stroke-dasharray="12 18"/>
	<rect x="386" y="650" width="470" height="34" rx="17" fill="#907c87" fill-opacity="0.62"/>
	<path d="M520 650 L566 510 H750 L806 650Z" fill="#5e6078" fill-opacity="0.9"/>
	<rect x="588" y="540" width="140" height="80" rx="10" fill="#bce5f8" fill-opacity="0.75"/>
</svg>`);

const heroAvatar = await sharp(avatarPath).resize(452, 452, { fit: 'cover' }).png().toBuffer();
await sharp(heroBackground)
	.composite([{ input: heroAvatar, left: 1034, top: 182 }])
	.webp({ quality: 86, effort: 5 })
	.toFile(heroOutputPath);

console.log('Generated', path.relative(root, outputPath), 'and', path.relative(root, heroOutputPath));
