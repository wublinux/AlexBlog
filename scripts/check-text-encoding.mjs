import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { TextDecoder } from 'node:util';

const ROOT = process.cwd();
const TEXT_EXTENSIONS = new Set(['.astro', '.css', '.json', '.md', '.mjs', '.ts']);
const SKIP_DIRECTORIES = new Set(['.astro', '.git', 'dist', 'node_modules']);
const suspiciousMarkers = [
	{ label: 'Unicode replacement character', value: String.fromCodePoint(0xfffd) },
	{ label: 'common UTF-8 mojibake', value: String.fromCodePoint(0x00c3) },
	{ label: 'common UTF-8 mojibake', value: String.fromCodePoint(0x00c2) },
	{ label: 'common UTF-8 mojibake', value: String.fromCodePoint(0x9225) },
	{ label: 'common UTF-8 mojibake', value: String.fromCodePoint(0x951b) },
	{ label: 'common UTF-8 mojibake', value: String.fromCodePoint(0x9286) },
	{ label: 'common UTF-8 mojibake', value: String.fromCodePoint(0x9983) },
];

async function collectFiles(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		if (entry.isDirectory() && SKIP_DIRECTORIES.has(entry.name)) continue;
		const absolutePath = path.join(directory, entry.name);
		if (entry.isDirectory()) files.push(...(await collectFiles(absolutePath)));
		else if (TEXT_EXTENSIONS.has(path.extname(entry.name))) files.push(absolutePath);
	}
	return files;
}

const decoder = new TextDecoder('utf-8', { fatal: true });
const failures = [];
for (const file of await collectFiles(ROOT)) {
	const buffer = await readFile(file);
	let text;
	try {
		text = decoder.decode(buffer);
	} catch {
		failures.push(`${path.relative(ROOT, file)}: invalid UTF-8`);
		continue;
	}

	for (const { label, value } of suspiciousMarkers) {
		const index = text.indexOf(value);
		if (index < 0) continue;
		const line = text.slice(0, index).split(/\r?\n/u).length;
		failures.push(`${path.relative(ROOT, file)}:${line}: ${label} (${JSON.stringify(value)})`);
	}
}

if (failures.length > 0) {
	console.error('Text encoding check failed:\n' + failures.map((failure) => `- ${failure}`).join('\n'));
	process.exitCode = 1;
} else {
	console.log('Text encoding check passed.');
}
