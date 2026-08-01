export const getNavLinks = (base: string) => [
	{ href: `${base}`, label: 'Home' },
	{ href: `${base}blog/`, label: 'Blog' },
	{ href: `${base}tags/`, label: 'Tags' },
	{ href: `${base}links/`, label: 'Projects' },
	{ href: `${base}github-daily/`, label: 'GitHub Daily' },
	{ href: `${base}about/`, label: 'About' },
];
