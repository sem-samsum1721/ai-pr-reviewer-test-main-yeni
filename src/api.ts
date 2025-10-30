import express, { Request, Response } from 'express';
import { analyzePipeline } from './analyzePipeline';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import type { PullRequest, PRAnalysis, WebhookEvent, Settings, Repository } from '../frontend/src/types';
import {
  getDefaultBranch,
  getBranchCommitSha,
  getRepoTree,
  getFileContent,
  listRepositoryPullRequests,
  listAccessibleRepositories,
  setGitHubAuthToken,
} from './github';
import { sendToWebSocket } from './websocketManager';

export const apiRouter = express.Router();

// In-memory storage (in production, use a database)
let pullRequests: PullRequest[] = [];
let prAnalyses: PRAnalysis[] = [];
let webhookEvents: WebhookEvent[] = [];
let settings: Settings = {
  selected_repositories: [],
  auto_analysis: true,
  notification_settings: {
    email_notifications: false,
    slack_notifications: false,
    discord_notifications: false,
  },
};

// WebSocket instance
let io: SocketIOServer | null = null;

export function initializeWebSocket(server: HTTPServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: ["http://localhost:3001", "http://localhost:3002", "http://127.0.0.1:3001", "http://127.0.0.1:3002", "http://localhost:5173", "http://127.0.0.1:5173"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('🔌 Client connected to WebSocket');
    
    // Send recent events to newly connected client
    socket.emit('recent-events', webhookEvents.slice(-50));
    
    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected from WebSocket');
    });
  });

  return io;
}

// Emit event to all connected clients
export function emitWebhookEvent(event: WebhookEvent) {
  webhookEvents.push(event);
  
  // Keep only last 1000 events
  if (webhookEvents.length > 1000) {
    webhookEvents = webhookEvents.slice(-1000);
  }
  
  if (io) {
    io.emit('webhook_event', event);
  }
  
  // Also broadcast to native WS clients
  try {
    sendToWebSocket({ type: 'webhook_event', detail: event });
  } catch (e) {
    console.warn('Failed to broadcast to native WS:', e);
  }
}

// Latest repo analysis metrics (in-memory)
type RepoAnalysisMetrics = {
  repo: string;
  total_lines: number;
  files_analyzed: number;
  avg_lines_per_file: number;
  comment_ratio: number; // 0..1
  efficiency_score: number; // 0..100
  security_score: number; // 0..100
  performance_score: number; // 0..100
  suggestions: string[];
  analyzed_at: string;
};

let latestRepoAnalysis: RepoAnalysisMetrics | null = null;

const PR_CACHE_TTL_MS = 60_000; // 1 minute cache
let pullRequestsLastSynced = 0;
let pullRequestsSyncPromise: Promise<PullRequest[]> | null = null;

function normalizeRepositorySlug(slug: string | undefined | null) {
  if (!slug) return null;
  const parts = slug.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return { owner: parts[0], repo: parts[1] };
}

function getConfiguredRepositories(): string[] {
  const unique = new Set<string>();
  settings.selected_repositories?.forEach((repo) => {
    if (normalizeRepositorySlug(repo)) {
      unique.add(repo);
    }
  });

  const fallbackRepos = [
    settings.default_repository,
    process.env.DEFAULT_REPOSITORY,
    process.env.GITHUB_REPOSITORY,
  ];

  fallbackRepos.forEach((repo) => {
    if (repo && normalizeRepositorySlug(repo)) {
      unique.add(repo);
    }
  });

  return Array.from(unique);
}

function mapGitHubPullToPullRequest(
  pull: any,
  owner: string,
  repo: string,
): PullRequest {
  const status: PullRequest['status'] =
    pull.state === 'open' ? 'open' : pull.merged_at ? 'merged' : 'closed';

  return {
    id: pull.id,
    number: pull.number,
    title: pull.title || '(untitled)',
    author: pull.user?.login || 'unknown',
    created_at: pull.created_at,
    updated_at: pull.updated_at,
    status,
    repository: `${owner}/${repo}`,
    branch: pull.head?.ref || '',
    base_branch: pull.base?.ref || '',
    head_branch: pull.head?.ref || '',
    additions: pull.additions ?? 0,
    deletions: pull.deletions ?? 0,
    changed_files: pull.changed_files ?? 0,
    url: pull.url,
    html_url: pull.html_url,
    body: pull.body || undefined,
  };
}

export async function syncPullRequests(options: { force?: boolean } = {}) {
  const now = Date.now();

  if (
    !options.force &&
    pullRequests.length > 0 &&
    now - pullRequestsLastSynced < PR_CACHE_TTL_MS
  ) {
    return pullRequests;
  }

  if (pullRequestsSyncPromise) {
    return pullRequestsSyncPromise;
  }

  pullRequestsSyncPromise = (async () => {
    const repositories = getConfiguredRepositories();

    if (repositories.length === 0) {
      pullRequests = [];
      pullRequestsLastSynced = Date.now();
      return pullRequests;
    }

    const analysisStatusMap = new Map<number, PullRequest['analysis_status']>();
    pullRequests.forEach((pr) => {
      if (pr.analysis_status) {
        analysisStatusMap.set(pr.id, pr.analysis_status);
      }
    });
    prAnalyses.forEach((analysis) => {
      analysisStatusMap.set(analysis.pr_id, 'completed');
    });

    const aggregated: PullRequest[] = [];

    for (const slug of repositories) {
      const normalized = normalizeRepositorySlug(slug);
      if (!normalized) {
        console.warn(`[syncPullRequests] Skipping invalid repository identifier "${slug}"`);
        continue;
      }

      try {
        const pulls = await listRepositoryPullRequests(normalized.owner, normalized.repo, {
          state: 'all',
          perPage: 50,
          maxItems: 200,
        });

        pulls.forEach((pull) => {
          const mapped = mapGitHubPullToPullRequest(pull, normalized.owner, normalized.repo);
          const existingStatus = analysisStatusMap.get(mapped.id);
          if (existingStatus) {
            mapped.analysis_status = existingStatus;
          }
          aggregated.push(mapped);
        });
      } catch (error) {
        console.error(`[syncPullRequests] Failed to fetch pull requests for ${slug}:`, error);
        // Continue with other repositories to avoid breaking dashboard
        continue;
      }
    }

    aggregated.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    pullRequests = aggregated;
    pullRequestsLastSynced = Date.now();
    return pullRequests;
  })();

  try {
    return await pullRequestsSyncPromise;
  } finally {
    pullRequestsSyncPromise = null;
  }
}

// API Routes

// API base endpoint (sanity check + endpoint list)
apiRouter.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    endpoints: [
      'GET /api/prs',
      'GET /api/prs/:id',
      'GET /api/prs/:id/analysis',
      'POST /api/prs/analyze',
      'GET /api/events',
      'GET /api/settings',
      'GET /api/repositories',
      'POST /api/repositories/scan',
      'GET /api/stats'
    ]
  });
});

// Get all pull requests
apiRouter.get('/prs', async (req: Request, res: Response) => {
  try {
    const { status, repository, author, page = 1, limit = 20, refresh, search } = req.query;

    await syncPullRequests({ force: refresh === 'true' });

    let filteredPRs = [...pullRequests];

    if (status) {
      filteredPRs = filteredPRs.filter((pr) => pr.status === status);
    }

    if (repository) {
      const repoFilter = String(repository).toLowerCase();
      filteredPRs = filteredPRs.filter((pr) =>
        pr.repository.toLowerCase().includes(repoFilter),
      );
    }

    if (author) {
      const authorFilter = String(author).toLowerCase();
      filteredPRs = filteredPRs.filter((pr) =>
        pr.author.toLowerCase().includes(authorFilter),
      );
    }

    if (search) {
      const query = String(search).toLowerCase();
      filteredPRs = filteredPRs.filter((pr) => {
        const haystack = `${pr.title} ${pr.author} ${pr.repository}`.toLowerCase();
        return haystack.includes(query);
      });
    }

    // Sort by created_at desc
    filteredPRs.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    // Pagination
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const startIndex = (pageNumber - 1) * limitNumber;
    const endIndex = startIndex + limitNumber;
    const paginatedPRs = filteredPRs.slice(startIndex, endIndex);

    res.json({
      data: paginatedPRs,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: filteredPRs.length,
        totalPages: Math.ceil(filteredPRs.length / limitNumber) || 0,
      },
    });
  } catch (error) {
    console.error('Failed to retrieve pull requests:', error);
    res.status(500).json({ error: 'Failed to load pull requests' });
  }
});

// Get specific pull request
apiRouter.get('/prs/:id', async (req: Request, res: Response) => {
  try {
    await syncPullRequests();

    const prId = Number(req.params.id);
    const pr = pullRequests.find((p) => p.id === prId);
    
    if (!pr) {
      return res.status(404).json({ error: 'Pull request not found' });
    }
    
    res.json(pr);
  } catch (error) {
    console.error('Failed to load pull request detail:', error);
    res.status(500).json({ error: 'Failed to load pull request' });
  }
});

// Get PR analysis
apiRouter.get('/prs/:id/analysis', (req: Request, res: Response) => {
  const prId = Number(req.params.id);
  const analysis = prAnalyses.find(a => a.pr_id === prId);
  
  if (!analysis) {
    return res.status(404).json({ error: 'Analysis not found' });
  }
  
  res.json(analysis);
});

// Trigger PR analysis manually
apiRouter.post('/prs/analyze', async (req: Request, res: Response) => {
  try {
    const { owner, repo, pr } = req.body || {};

    if (!owner || !repo || !pr) {
      return res.status(400).json({ error: 'Missing required fields: owner, repo, pr' });
    }

    const prNumber = Number(pr);
    if (Number.isNaN(prNumber)) {
      return res.status(400).json({ error: 'Invalid pr number' });
    }

    try {
      await syncPullRequests();
      const repoSlug = `${owner}/${repo}`;
      const targetPR = pullRequests.find(
        (item) => item.number === prNumber && item.repository === repoSlug,
      );
      if (targetPR) {
        targetPR.analysis_status = 'in_progress';
      }
    } catch (error) {
      console.warn('Unable to refresh PR cache before analysis:', error);
    }

    // Run analysis asynchronously
    analyzePipeline(owner, repo, prNumber).catch((err) => {
      console.error('Analysis error in manual pipeline:', err);
    });

    return res.status(202).json({
      message: 'PR review started',
      pr: prNumber,
      repo: `${owner}/${repo}`
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});
// Get webhook events
apiRouter.get('/events', (req: Request, res: Response) => {
  const { type, limit = 50 } = req.query;
  
  let filteredEvents = [...webhookEvents];
  
  if (type) {
    filteredEvents = filteredEvents.filter(event => event.type === type);
  }
  
  // Sort by timestamp desc and limit
  filteredEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  filteredEvents = filteredEvents.slice(0, Number(limit));
  
  res.json(filteredEvents);
});

// Get settings
apiRouter.get('/settings', (req: Request, res: Response) => {
  res.json(settings);
});

// Update settings
apiRouter.put('/settings', async (req: Request, res: Response) => {
  try {
    const nextSettings: Settings = { ...settings, ...req.body };

    if (Array.isArray(req.body.selected_repositories)) {
      nextSettings.selected_repositories = req.body.selected_repositories
        .filter((repo: unknown): repo is string => typeof repo === 'string' && !!normalizeRepositorySlug(repo))
        .map((repo: string) => repo.trim());
    }

    if (typeof req.body.default_repository === 'string') {
      nextSettings.default_repository = normalizeRepositorySlug(req.body.default_repository)
        ? req.body.default_repository.trim()
        : undefined;
    }

    settings = nextSettings;

    if (Object.prototype.hasOwnProperty.call(req.body, 'github_api_key')) {
      const token =
        typeof req.body.github_api_key === 'string' && req.body.github_api_key.trim().length > 0
          ? req.body.github_api_key.trim()
          : undefined;
      setGitHubAuthToken(token);
    }

    if (
      Array.isArray(req.body.selected_repositories) ||
      typeof req.body.default_repository === 'string'
    ) {
      try {
        await syncPullRequests({ force: true });
      } catch (error) {
        console.error('Failed to refresh pull requests after settings update:', error);
      }
    }

    res.json(settings);
  } catch (error) {
    res.status(400).json({ error: 'Invalid settings data' });
  }
});

// Get repositories from GitHub
apiRouter.get('/repositories', async (req: Request, res: Response) => {
  try {
    const repos = await listAccessibleRepositories();

    const mapped: Repository[] = repos.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      owner: repo.owner?.login ?? '',
      private: Boolean(repo.private),
      url: repo.html_url ?? repo.url ?? '',
      default_branch: repo.default_branch ?? 'main',
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Failed to list repositories:', error);
    const message =
      error instanceof Error && /Requires authentication/i.test(error.message)
        ? 'GitHub authentication required'
        : 'Failed to load repositories';
    res.status(400).json({ error: message });
  }
});

// Dashboard stats
apiRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    await syncPullRequests();

    const totalPRs = pullRequests.length;
    const openPRs = pullRequests.filter((pr) => pr.status === 'open').length;
    const mergedPRs = pullRequests.filter((pr) => pr.status === 'merged').length;
    const closedPRs = pullRequests.filter((pr) => pr.status === 'closed').length;
    const totalAnalyses = prAnalyses.length;
    const avgProcessingTime =
      totalAnalyses > 0
        ? prAnalyses.reduce((sum, a) => sum + a.processing_time, 0) / totalAnalyses
        : 0;

    const stats = {
      total_prs: totalPRs,
      open_prs: openPRs,
      merged_prs: mergedPRs,
      closed_prs: closedPRs,
      total_analyses: totalAnalyses,
      avg_processing_time: avgProcessingTime,
      recent_events: webhookEvents.slice(-10),
      repo_metrics: latestRepoAnalysis,
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Failed to load dashboard stats:', error);
    res.status(500).json({ error: 'Failed to load dashboard statistics' });
  }
});
// Start repository scan
apiRouter.post('/repositories/scan', async (req: Request, res: Response) => {
  try {
    const { repoUrl, owner, repo, options } = req.body || {};
    if (!repoUrl && (!owner || !repo)) {
      return res.status(400).json({ error: 'repoUrl veya owner/repo zorunludur' });
    }

    const resolved = (() => {
      if (owner && repo) return { owner, repo };
      const match = String(repoUrl).match(/github\.com\/(.*?)\/(.*?)(?:\/|$)/);
      if (!match) return null;
      return { owner: match[1], repo: match[2] };
    })();

    if (!resolved) {
      return res.status(400).json({ error: 'Geçersiz repo URL' });
    }

    const startEvent: WebhookEvent = {
      id: `${Date.now()}`,
      type: 'analysis_started',
      timestamp: new Date().toISOString(),
      repository: `${resolved.owner}/${resolved.repo}`,
      message: 'Repo taraması başlatıldı',
      data: { options },
    };
    webhookEvents.push(startEvent);
    io?.emit('webhook_event', startEvent);
    sendToWebSocket({ type: 'webhook_event', detail: startEvent });

    // Gerçek repo analizi
    const branch = await getDefaultBranch(resolved.owner, resolved.repo);
    const commitSha = await getBranchCommitSha(resolved.owner, resolved.repo, branch);
    const tree = await getRepoTree(resolved.owner, resolved.repo, commitSha);

    const filePaths = tree
      .filter(t => t.type === 'blob')
      .map(t => ({ path: t.path, size: t.size || 0 }))
      .filter(f => f.size < 200_000)
      .filter(f => /\.(ts|tsx|js|jsx|py|go|rs|java|kt|c|cpp|h|cs|php|rb|swift|scala|sh|yml|yaml|json|md|sql)$/i.test(f.path))
      .slice(0, 200)
      .map(f => f.path);

    let totalLines = 0;
    let commentLines = 0;
    let filesAnalyzed = 0;
    let securityHits = 0;
    let performanceHits = 0;

    const insecurePatterns = [/eval\(/i, /innerHTML\s*=\s*/i, /md5\(/i, /sha1\(/i, /password\s*=\s*['"]/i, /api_key\s*[:=]/i, /SECRET|TOKEN/i];
    const perfPatterns = [/for\s*\(.*\)\s*\{[^}]*for\s*\(/i, /while\s*\(.*\)\s*\{[^}]*while\s*\(/i];

    for (const path of filePaths) {
      try {
        const content = await getFileContent(resolved.owner, resolved.repo, branch, path);
        const lines = content.split(/\r?\n/);
        totalLines += lines.length;
        filesAnalyzed += 1;
        const commentLike = lines.filter(l => /(^\s*\/\/)|(^\s*#)|(^\s*\*)|(^\s*<!--)/.test(l)).length;
        commentLines += commentLike;
        insecurePatterns.forEach(p => { if (p.test(content)) securityHits += 1; });
        perfPatterns.forEach(p => { if (p.test(content)) performanceHits += 1; });
      } catch {}
    }

    const avgLinesPerFile = filesAnalyzed ? Number((totalLines / filesAnalyzed).toFixed(2)) : 0;
    const commentRatio = filesAnalyzed ? Number((commentLines / totalLines).toFixed(3)) : 0;
    const efficiencyScore = Math.max(0, Math.min(100, Math.round((1 - Math.min(avgLinesPerFile / 1000, 1)) * 60 + commentRatio * 40)));
    const securityScore = Math.max(0, Math.min(100, Math.round(100 - Math.min(securityHits * 10, 70))));
    const performanceScore = Math.max(0, Math.min(100, Math.round(100 - Math.min(performanceHits * 10, 70))));

    const suggestions: string[] = [];
    if (commentRatio < 0.1) suggestions.push('Yorum satırı oranı düşük: dokümantasyonu artırın');
    if (avgLinesPerFile > 500) suggestions.push('Dosyalar çok büyük: modülerleştirmeyi düşünün');
    if (securityHits > 0) suggestions.push('Potansiyel güvensiz kalıplar bulundu: güvenlik denetimi yapın');
    if (performanceHits > 0) suggestions.push('Olası performans sorunları: algoritmaları gözden geçirin');

    latestRepoAnalysis = {
      repo: `${resolved.owner}/${resolved.repo}`,
      total_lines: totalLines,
      files_analyzed: filesAnalyzed,
      avg_lines_per_file: avgLinesPerFile,
      comment_ratio: commentRatio,
      efficiency_score: efficiencyScore,
      security_score: securityScore,
      performance_score: performanceScore,
      suggestions,
      analyzed_at: new Date().toISOString(),
    };

    const doneEvent: WebhookEvent = {
      id: `${Date.now()}`,
      type: 'analysis_completed',
      timestamp: new Date().toISOString(),
      repository: `${resolved.owner}/${resolved.repo}`,
      message: 'Repo taraması tamamlandı',
      data: latestRepoAnalysis,
    };
    webhookEvents.push(doneEvent);
    io?.emit('webhook_event', doneEvent);
    sendToWebSocket({ type: 'webhook_event', detail: doneEvent });

    return res.status(202).json({
      message: 'Tarama tamamlandı',
      repo: `${resolved.owner}/${resolved.repo}`,
      analysis: latestRepoAnalysis,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});




