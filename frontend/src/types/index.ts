export interface PullRequest {
  id: number;
  number: number;
  title: string;
  author: string;
  created_at: string;
  updated_at: string;
  status: 'open' | 'closed' | 'merged';
  repository: string;
  branch: string;
  base_branch: string;
  head_branch: string;
  additions: number;
  deletions: number;
  changed_files: number;
  url: string;
  html_url: string;
  body?: string;
  analysis_status?: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface CodeQualityIssue {
  type: 'code_quality';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  description: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

export interface SecurityIssue {
  type: 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  description: string;
  recommendation: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

export interface PerformanceIssue {
  type: 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  description: string;
  optimization: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

export interface TestToAdd {
  type: 'test';
  description: string;
  file?: string;
  test_case?: string;
}

export interface CodeReviewResult {
  summary: string;
  confidence_level: number;
  code_quality: CodeQualityIssue[];
  security_issues: SecurityIssue[];
  performance_issues: PerformanceIssue[];
  tests_to_add: TestToAdd[];
}

export interface PRAnalysis {
  pr_id: number;
  analysis: CodeReviewResult;
  created_at: string;
  processing_time: number;
  code_summary?: string;
  quality_issues?: CodeQualityIssue[];
  security_issues?: SecurityIssue[];
  performance_issues?: PerformanceIssue[];
  tests_to_add?: TestToAdd[];
  overall_assessment?: string;
}

export type WebhookEventType =
  | 'pr_opened'
  | 'pr_closed'
  | 'pr_merged'
  | 'analysis_started'
  | 'analysis_completed'
  | 'webhook_received'
  | 'pr_review_started'
  | 'pr_review_error'
  | 'error';

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  timestamp: string;
  pr_number?: number;
  repository?: string;
  message: string;
  data?: any;
  payload?: any;
}

export interface Settings {
  github_token?: string;
  github_api_key?: string;
  openai_api_key?: string;
  google_ai_api_key?: string;
  selected_repositories: string[];
  webhook_url?: string;
  webhook_secret?: string;
  default_repository?: string;
  auto_analysis: boolean;
  enable_security_analysis?: boolean;
  enable_performance_analysis?: boolean;
  enable_test_suggestions?: boolean;
  max_file_size?: number;
  email_notifications?: boolean;
  notification_email?: string;
  notification_settings: {
    email_notifications: boolean;
    slack_notifications: boolean;
    discord_notifications: boolean;
  };
}

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  private: boolean;
  url: string;
  default_branch: string;
}

export interface RepoAnalysisMetrics {
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
}

export interface Event {
  id: string;
  type: WebhookEventType;
  timestamp: string;
  pr_number?: number;
  repository?: string;
  message: string;
  data?: any;
  payload?: any;
}

export type AnalysisStatus =
  | 'ANALYSIS_STARTED'
  | 'ANALYSIS_RUNNING'
  | 'ANALYSIS_PROCESSING'
  | 'ANALYSIS_COMPLETE'
  | 'ANALYSIS_FAILED';

export interface Finding {
  line: number;
  type: 'CRITICAL_BUG' | 'STYLE_SUGGESTION';
  message: string;
  confidence: number;
}

export interface AnalysisEvent {
  status: AnalysisStatus;
  message?: string;
  report?: string;
  findings?: Finding[];
  error?: string;
}

export type ActivityChannel = 'analysis' | 'webhook';

export interface ActivityFeedItem {
  id: string;
  channel: ActivityChannel;
  timestamp: string;
  title: string;
  message?: string;
  raw?: any;
}
