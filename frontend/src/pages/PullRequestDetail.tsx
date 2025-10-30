import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  GitPullRequest, 
  User, 
  Calendar, 
  GitBranch,
  AlertCircle,
  CheckCircle,
  XCircle,
  Shield,
  Zap,
  TestTube,
  FileText,
  ExternalLink
} from 'lucide-react';
import { pullRequestsApi } from '../services/api';
import { PullRequest, PRAnalysis } from '../types';
import { formatTimeAgo, getStatusColor, getSeverityColor } from '../utils/formatters';

export function PullRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const [pr, setPr] = useState<PullRequest | null>(null);
  const [analysis, setAnalysis] = useState<PRAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadPullRequest(parseInt(id));
    }
  }, [id]);

  const loadPullRequest = async (prId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const [prData, analysisData] = await Promise.all([
        pullRequestsApi.getById(prId),
        pullRequestsApi.getAnalysis(prId).catch(() => null), // Analysis might not exist
      ]);
      
      setPr(prData);
      setAnalysis(analysisData);
    } catch (err) {
      setError('Failed to load pull request details');
      console.error('PR detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !pr) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Hata</h3>
            <p className="mt-2 text-sm text-red-700">{error || 'Pull request not found'}</p>
            <Link
              to="/pull-requests"
              className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
            >
              Pull request'lere geri dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-white to-gray-50 rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/pull-requests"
            className="flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200 group"
          >
            <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium">Pull Request'lere Dön</span>
          </Link>
          
          {pr.html_url && (
            <a
              href={pr.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors duration-200 group"
            >
              <span className="font-medium">GitHub'da Görüntüle</span>
              <ExternalLink className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
            </a>
          )}
        </div>

        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <GitPullRequest className="h-6 w-6 text-white" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                #{pr.number}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(pr.status)}`}>
                {pr.status}
              </span>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
              {pr.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span className="font-medium">{pr.author}</span>
              </div>
              <div className="flex items-center space-x-2">
                <GitBranch className="h-4 w-4" />
                <span className="font-medium">{pr.repository}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>{formatTimeAgo(new Date(pr.created_at))}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced PR Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="space-y-6">
          {/* Branch Information */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <GitBranch className="h-4 w-4 mr-2 text-blue-600" />
              Branch Information
            </h3>
            <div className="flex items-center justify-center space-x-4">
              <div className="text-center">
                <div className="font-mono bg-white px-3 py-2 rounded-lg border border-blue-200 text-sm font-medium text-gray-700">
                  {pr.head_branch}
                </div>
                <div className="text-xs text-gray-500 mt-1">Source</div>
              </div>
              <div className="flex items-center text-blue-600">
                <ArrowLeft className="h-5 w-5 rotate-180" />
              </div>
              <div className="text-center">
                <div className="font-mono bg-white px-3 py-2 rounded-lg border border-blue-200 text-sm font-medium text-gray-700">
                  {pr.base_branch}
                </div>
                <div className="text-xs text-gray-500 mt-1">Target</div>
              </div>
            </div>
          </div>

          {/* Changes Summary */}
          {(pr.additions !== undefined || pr.deletions !== undefined) && (
            <div className="bg-gradient-to-r from-green-50 to-red-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Code Changes</h3>
              <div className="flex items-center justify-center space-x-6">
                {pr.additions !== undefined && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">+{pr.additions}</div>
                    <div className="text-xs text-green-600 font-medium">additions</div>
                  </div>
                )}
                {pr.deletions !== undefined && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">-{pr.deletions}</div>
                    <div className="text-xs text-red-600 font-medium">deletions</div>
                  </div>
                )}
                {pr.additions !== undefined && pr.deletions !== undefined && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">{pr.additions + pr.deletions}</div>
                    <div className="text-xs text-gray-600 font-medium">total changes</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {pr.body && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <FileText className="h-4 w-4 mr-2 text-gray-600" />
                Description
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{pr.body}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Analysis Results */}
      {analysis ? (
        <div className="space-y-6">
          {/* Code Summary */}
          {analysis.code_summary && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Code Summary</h3>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 leading-relaxed">{analysis.code_summary}</p>
                </div>
              </div>
            </div>
          )}

          {/* Quality Issues */}
          {analysis.quality_issues && analysis.quality_issues.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Code Quality Issues</h3>
                </div>
                <span className="bg-orange-100 text-orange-800 text-sm font-medium px-3 py-1 rounded-full">
                  {analysis.quality_issues.length} issue{analysis.quality_issues.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-4">
                {analysis.quality_issues.map((issue, index) => (
                  <div key={index} className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-4 border-l-4 border-orange-400 hover:shadow-sm transition-shadow duration-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="text-sm font-semibold text-orange-900">{issue.type}</h4>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                            {issue.severity}
                          </span>
                        </div>
                        <p className="text-sm text-orange-800 mb-2">{issue.description}</p>
                        {issue.file && (
                          <p className="text-xs text-orange-600 font-mono bg-white px-2 py-1 rounded border border-orange-200 inline-block">
                            {issue.file}:{issue.line}
                          </p>
                        )}
                        {issue.suggestion && (
                          <div className="mt-3 p-3 bg-white rounded border border-orange-200">
                            <p className="text-sm text-orange-900 font-medium">
                              💡 Suggestion: {issue.suggestion}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
             </div>
           )}

           {/* Security Issues */}
            {analysis.security_issues && analysis.security_issues.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">Security Issues</h3>
                  </div>
                  <span className="bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full">
                    {analysis.security_issues.length} issue{analysis.security_issues.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-4">
                  {analysis.security_issues.map((issue, index) => (
                    <div key={index} className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-4 border-l-4 border-red-400 hover:shadow-sm transition-shadow duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="text-sm font-semibold text-red-900">{issue.type}</h4>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                              {issue.severity}
                            </span>
                          </div>
                          <p className="text-sm text-red-800 mb-2">{issue.description}</p>
                          {issue.file && (
                            <p className="text-xs text-red-600 font-mono bg-white px-2 py-1 rounded border border-red-200 inline-block">
                              {issue.file}:{issue.line}
                            </p>
                          )}
                          {issue.recommendation && (
                            <div className="mt-3 p-3 bg-white rounded border border-red-200">
                              <p className="text-sm text-red-900 font-medium">
                                🔒 Recommendation: {issue.recommendation}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
               </div>
             )}

             {/* Performance Issues */}
            {analysis.performance_issues && analysis.performance_issues.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">Performance Issues</h3>
                  </div>
                  <span className="bg-yellow-100 text-yellow-800 text-sm font-medium px-3 py-1 rounded-full">
                    {analysis.performance_issues.length} issue{analysis.performance_issues.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-4">
                  {analysis.performance_issues.map((issue, index) => (
                    <div key={index} className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border-l-4 border-yellow-400 hover:shadow-sm transition-shadow duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="text-sm font-semibold text-yellow-900">{issue.type}</h4>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                              {issue.severity}
                            </span>
                          </div>
                          <p className="text-sm text-yellow-800 mb-2">{issue.description}</p>
                          {issue.file && (
                            <p className="text-xs text-yellow-600 font-mono bg-white px-2 py-1 rounded border border-yellow-200 inline-block">
                              {issue.file}:{issue.line}
                            </p>
                          )}
                          {issue.optimization && (
                            <div className="mt-3 p-3 bg-white rounded border border-yellow-200">
                              <p className="text-sm text-yellow-900 font-medium">
                                ⚡ Optimization: {issue.optimization}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
               </div>
             )}

             {/* Test Suggestions */}
            {analysis.tests_to_add && analysis.tests_to_add.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <TestTube className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">Test Suggestions</h3>
                  </div>
                  <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                    {analysis.tests_to_add.length} suggestion{analysis.tests_to_add.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-4">
                  {analysis.tests_to_add.map((test, index) => (
                    <div key={index} className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border-l-4 border-green-400 hover:shadow-sm transition-shadow duration-200">
                      <div className="flex items-start">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-green-900 mb-2">{test.type}</h4>
                          <p className="text-sm text-green-800 mb-2">{test.description}</p>
                          {test.file && (
                            <p className="text-xs text-green-600 font-mono bg-white px-2 py-1 rounded border border-green-200 inline-block">
                              {test.file}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
               </div>
             )}

             {/* Overall Assessment */}
            {analysis.overall_assessment && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Overall Assessment</h3>
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 leading-relaxed">{analysis.overall_assessment}</p>
                  </div>
                </div>
              </div>
             )}
           </div>
         ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Analysis Available</h3>
            <p className="text-gray-500 mb-4">
              This pull request hasn't been analyzed yet.
            </p>
            <div className="text-sm text-gray-400">
              Analysis will appear here once the PR is processed by our AI reviewer.
            </div>
           </div>
         )}
       </div>
     );
   }