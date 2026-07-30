import type { CmsEnv } from '../types';
import { authenticate } from '../lib/auth-middleware';
import { githubRequest } from '../lib/github';
import { json, methodNotAllowed } from '../lib/http';

interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  head_sha: string;
}

interface WorkflowRunsResponse {
  workflow_runs: WorkflowRun[];
}

export async function handleDeploy(request: Request, env: CmsEnv): Promise<Response> {
  if (request.method !== 'GET') return methodNotAllowed(['GET']);
  const authentication = await authenticate(request, env);
  if (!authentication.authenticated) return authentication.response;

  const data = await githubRequest<WorkflowRunsResponse>(
    authentication.auth.token,
    `/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}/actions/runs?per_page=1&branch=${encodeURIComponent(env.GITHUB_BRANCH)}`,
  );
  const run = data.workflow_runs[0];

  return json({
    deployment: run
      ? {
          id: run.id,
          name: run.name,
          status: run.status,
          conclusion: run.conclusion,
          createdAt: run.created_at,
          updatedAt: run.updated_at,
          url: run.html_url,
          commitSha: run.head_sha,
        }
      : null,
  });
}
