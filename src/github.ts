import { Octokit } from '@octokit/rest';

type PullState = 'open' | 'closed' | 'all';

function createOctokitInstance(token?: string) {
  const normalizedToken = token?.trim();
  if (normalizedToken) {
    return new Octokit({ auth: normalizedToken });
  }

  const envToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (envToken) {
    return new Octokit({ auth: envToken.trim() });
  }

  return new Octokit();
}

let octokit = createOctokitInstance();

export function setGitHubAuthToken(token?: string) {
  octokit = createOctokitInstance(token);
  return token ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? null;
}

/**
 * Get all files changed in a PR
 * Returns array of file objects with filename, status, additions, deletions, changes, raw_url, patch
 */
export async function getPrChangedFiles(owner: string, repo: string, prNumber: number) {
  try {
    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });

    return files.map(file => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      raw_url: file.raw_url,
      patch: file.patch || '',
    }));
  } catch (error) {
    console.error('Error fetching PR files:', error);
    throw new Error(`Failed to get PR files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get file content from GitHub at specific ref
 * @param owner Repository owner
 * @param repo Repository name
 * @param ref Git reference (branch, commit, tag)
 * @param path File path
 */
export async function getFileContent(owner: string, repo: string, ref: string, path: string): Promise<string> {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if ('content' in data) {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    
    throw new Error('File content not found');
  } catch (error) {
    console.error('Error fetching file content:', error);
    throw new Error(`Failed to get file content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all files changed in a PR (legacy function name for backward compatibility)
 */
export async function getPrFiles(owner: string, repo: string, prNumber: number) {
  return getPrChangedFiles(owner, repo, prNumber);
}

/**
 * Post comment to PR
 */
export async function postPrComment(owner: string, repo: string, prNumber: number, comment: string) {
  try {
    const { data } = await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: comment,
    });

    return data;
  } catch (error) {
    console.error('Error posting PR comment:', error);
    throw new Error(`Failed to post comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get default branch of a repository
 */
export async function getDefaultBranch(owner: string, repo: string): Promise<string> {
  const { data } = await octokit.repos.get({ owner, repo });
  return data.default_branch || 'main';
}

/**
 * Get latest commit SHA for a branch
 */
export async function getBranchCommitSha(owner: string, repo: string, branch: string): Promise<string> {
  const { data } = await octokit.repos.getBranch({ owner, repo, branch });
  return data.commit.sha;
}

/**
 * Get full repository tree (recursive)
 */
export async function getRepoTree(owner: string, repo: string, commitSha: string): Promise<Array<{ path: string; type: 'blob' | 'tree'; size?: number }>> {
  const { data } = await octokit.git.getTree({ owner, repo, tree_sha: commitSha, recursive: 'true' });
  // @ts-ignore
  return (data.tree || []).map((t: any) => ({ path: t.path, type: t.type, size: t.size }));
}

/**
 * List pull requests for a repository
 */
export async function listRepositoryPullRequests(
  owner: string,
  repo: string,
  options: { state?: PullState; perPage?: number; maxItems?: number } = {}
) {
  const state = options.state ?? 'all';
  const perPage = Math.min(Math.max(options.perPage ?? 50, 1), 100);
  const maxItems = options.maxItems ?? 200;

  try {
    const pulls = await octokit.paginate(octokit.pulls.list, {
      owner,
      repo,
      state,
      per_page: perPage,
    });

    return pulls.slice(0, maxItems);
  } catch (error) {
    console.error('Error fetching pull requests:', error);
    throw new Error(
      `Failed to list pull requests: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * List repositories accessible to the authenticated user
 */
export async function listAccessibleRepositories(options: { perPage?: number } = {}) {
  const perPage = Math.min(Math.max(options.perPage ?? 100, 1), 100);

  try {
    return await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
      per_page: perPage,
      affiliation: 'owner,collaborator,organization_member',
    });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    throw new Error(
      `Failed to list repositories: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export { octokit };

export async function getDiff(diffUrl: string): Promise<string> {
  try {
    const response = await octokit.request(`GET ${diffUrl}`, {
      headers: { accept: 'application/vnd.github.v3.diff' },
    });
    const data = response.data as unknown;
    if (typeof data === 'string') {
      return data;
    }
    // Fallback: bazı durumlarda Octokit veri nesnesi döndürebilir
    return typeof (data as any)?.toString === 'function' ? (data as any).toString() : JSON.stringify(data);
  } catch (error) {
    console.error('Error fetching diff content:', error);
    throw new Error(`Failed to fetch diff: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
