import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
	darkMode: 'class',
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['"Alibaba PuHuiTi"', 'var(--font-inter)', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
				serif: ['"Source Han Serif SC"', '"Noto Serif CJK SC"', '"Songti SC"', '"STSong"', '"Alibaba PuHuiTi"', 'Georgia', 'serif'],
				mono: ['var(--font-jetbrains-mono)', '"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
			},
		},
	},
	plugins: [typography],
};
