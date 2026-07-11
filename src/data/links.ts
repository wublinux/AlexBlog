export type FriendLink = {
	name: string;
	url: string;
	kind: 'github' | 'bilibili';
	github?: string;
	bilibili?: string;
	type?: 'github' | 'bilibili';
	avatar?: string;
	description?: string;
	tags?: string[];
	status?: 'active' | 'inactive';
};

export const links: FriendLink[] = [
	{
		name: 'Alex Huang',
		kind: 'github',
		github: 'wublinux',
		url: 'https://github.com/wublinux',
		description: 'Developer passionate about technology, learning, and building practical systems.',
		tags: ['Tech', 'Notes', 'Life'],
		status: 'active',
	},
];
