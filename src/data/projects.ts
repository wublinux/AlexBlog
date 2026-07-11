export type GitHubProjectConfig = {
	owner: string;
	repo: string;
	displayName: string;
	fallbackDescription: string;
	fallbackTags: string[];
};

export const githubProjects: GitHubProjectConfig[] = [
	{
		owner: 'wublinux',
		repo: 'AlexBlog',
		displayName: "Alex's Blog",
		fallbackDescription: 'A fast Astro blog for technical notes, experiments, and long-form writing.',
		fallbackTags: ['Astro', 'Tailwind CSS', 'Blog'],
	},
	{
		owner: 'wublinux',
		repo: 'supply-chain-risk-alert',
		displayName: 'Supply Chain Risk Alert',
		fallbackDescription: 'Supplier risk intelligence across delivery, price, quality, and sentiment signals.',
		fallbackTags: ['Python', 'Risk Intelligence', 'Automation'],
	},
	{
		owner: 'wublinux',
		repo: 'Contract-machine',
		displayName: 'Contract Machine',
		fallbackDescription: 'Experiments in contract workflows, document processing, and practical automation.',
		fallbackTags: ['TypeScript', 'Contracts', 'Automation'],
	},
	{
		owner: 'wublinux',
		repo: 'EFS-forecasting',
		displayName: 'EFS Forecasting',
		fallbackDescription: 'Forecasting experiments and reproducible modeling workflows for EFS data.',
		fallbackTags: ['Forecasting', 'Data', 'Research'],
	},
];
