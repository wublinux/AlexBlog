import { readFile, writeFile } from 'node:fs/promises';

const generatedTypesUrl = new URL('../worker-configuration.d.ts', import.meta.url);
const source = await readFile(generatedTypesUrl, 'utf8');
const normalized = source.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '');

if (source !== normalized) {
  await writeFile(generatedTypesUrl, normalized);
}
