import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { PullRequests } from './pages/PullRequests';
import { PullRequestDetail } from './pages/PullRequestDetail';
import { Events } from './pages/Events';
import { Settings } from './pages/Settings';
import { RepoScan } from './pages/RepoScan';
import { ResultsDisplay, ActivityPanel } from './components';
import { websocketService } from './services/websocket';
import type {
  AnalysisEvent,
  Finding,
  WebhookEvent,
  ActivityFeedItem,
} from './types';

function App() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [analysisStatus, setAnalysisStatus] = useState<string>('IDLE');
  const [report, setReport] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);

  useEffect(() => {
    websocketService.connect();

    const push = (item: ActivityFeedItem) => {
      setActivityFeed((prev) => [item, ...prev].slice(0, 150));
    };

    const unsubscribeAnalysis = websocketService.onAnalysisEvent((evt: AnalysisEvent) => {
      if (evt.status) {
        setAnalysisStatus(evt.status);
      }
      if (evt.status === 'ANALYSIS_COMPLETE') {
        setFindings(evt.findings || []);
        setReport(evt.report);
        setError(undefined);
      }
      if (
        evt.status === 'ANALYSIS_STARTED' ||
        evt.status === 'ANALYSIS_RUNNING' ||
        evt.status === 'ANALYSIS_PROCESSING'
      ) {
        setFindings([]);
        setReport(undefined);
        setError(undefined);
      }
      if (evt.status === 'ANALYSIS_FAILED') {
        setError(evt.error || 'Analiz sirasinda beklenmeyen bir hata olustu.');
        setReport(undefined);
      }

      const title = getAnalysisTitle(evt.status);
      const message =
        evt.status === 'ANALYSIS_FAILED'
          ? evt.error || 'Analysis failed'
          : evt.status === 'ANALYSIS_COMPLETE'
          ? `Completed with ${(evt.findings || []).length} finding(s)`
          : evt.message;

      push({
        id: `analysis-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        channel: 'analysis',
        timestamp: new Date().toISOString(),
        title,
        message,
        raw: evt,
      });
    });

    const unsubscribeWebhook = websocketService.onWebhookEvent((evt: WebhookEvent) => {
      push({
        id: `webhook-${evt.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`,
        channel: 'webhook',
        timestamp: evt.timestamp || new Date().toISOString(),
        title: getWebhookTitle(evt),
        message: evt.message,
        raw: evt,
      });
    });

    return () => {
      unsubscribeAnalysis();
      unsubscribeWebhook();
      websocketService.disconnect();
    };
  }, []);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/prs" element={<PullRequests />} />
        <Route path="/prs/:id" element={<PullRequestDetail />} />
        <Route path="/events" element={<Events />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/scan" element={<RepoScan />} />
      </Routes>

      <div className="mt-6">
        <ResultsDisplay
          findings={findings}
          status={analysisStatus}
          report={report}
          error={error}
        />
      </div>

      <ActivityPanel events={activityFeed} />
    </Layout>
  );
}

export default App;

function getAnalysisTitle(status?: string): string {
  const mapping: Record<string, string> = {
    ANALYSIS_STARTED: 'Analysis started',
    ANALYSIS_RUNNING: 'Analysis running',
    ANALYSIS_PROCESSING: 'Analysis processing',
    ANALYSIS_COMPLETE: 'Analysis complete',
    ANALYSIS_FAILED: 'Analysis failed',
  };
  if (!status) {
    return 'Analysis event';
  }
  return mapping[status] || status;
}

function getWebhookTitle(evt: WebhookEvent): string {
  const typeLabel = evt.type ? evt.type.replace(/_/g, ' ') : 'Webhook';
  if (evt.data?.pr) {
    return `${typeLabel} #${evt.data.pr}`;
  }
  if (evt.pr_number) {
    return `${typeLabel} #${evt.pr_number}`;
  }
  return typeLabel;
}
