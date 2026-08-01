import { execFileSync } from 'node:child_process';

const branch = process.env.PRODUCTION_BRANCH || 'V2.0.0';

function git(args) {
	return execFileSync('git', args, {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	}).trim();
}

function fail(message) {
	console.error(`Production source verification failed: ${message}`);
	process.exit(1);
}

if (process.env.GITHUB_ACTIONS !== 'true') {
	fail('production Pages deployment is restricted to GitHub Actions');
}

try {
	git([
		'fetch',
		'--no-tags',
		'origin',
		`refs/heads/${branch}:refs/remotes/origin/${branch}`,
	]);

	const headSha = git(['rev-parse', 'HEAD']);
	const remoteSha = git(['rev-parse', `refs/remotes/origin/${branch}`]);
	if (headSha !== remoteSha) {
		fail(`checked out ${headSha.slice(0, 7)}, but origin/${branch} is ${remoteSha.slice(0, 7)}`);
	}

	const trackedChanges = git(['status', '--porcelain', '--untracked-files=no']);
	if (trackedChanges) {
		fail('tracked files changed after checkout; refusing to deploy an uncommitted build source');
	}

	console.log(`Production source verified at origin/${branch} ${headSha.slice(0, 7)}.`);
} catch (error) {
	if (typeof error?.status === 'number') {
		const detail = error.stderr?.trim();
		fail(detail || `git exited with status ${error.status}`);
	}
	throw error;
}
