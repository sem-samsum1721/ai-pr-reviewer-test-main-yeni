import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  GitPullRequest, 
  User, 
  Calendar, 
  GitBranch,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { pullRequestsApi, PaginatedResponse } from '../services/api';
import { PullRequest } from '../types';
import { formatTimeAgo, getStatusColor } from '../utils/formatters';

export function PullRequests() {
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [repositoryFilter, setRepositoryFilter] = useState<string>('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    loadPullRequests();
  }, [searchTerm, statusFilter, repositoryFilter, pagination.page]);

  const loadPullRequests = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (statusFilter) params.status = statusFilter;
      if (repositoryFilter) params.repository = repositoryFilter;
      if (searchTerm) params.search = searchTerm;
      if (forceRefresh) params.refresh = true;

      const response: PaginatedResponse<PullRequest> = await pullRequestsApi.getAll(params);
      setPrs(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError('Failed to load pull requests');
      console.error('Pull requests error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleRepositoryFilter = (repo: string) => {
    setRepositoryFilter(repo);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const uniqueRepositories = [...new Set(prs.map(pr => pr.repository))];

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Hata</h3>
            <p className="mt-2 text-sm text-red-700">{error}</p>
            <button
              onClick={() => loadPullRequests()}
              className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
            >
              Tekrar dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Pull Request'ler</h1>
          <p className="text-gray-600 text-lg">Pull request'lerinizi yönetin ve inceleyin</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600">
            {pagination.total} toplam pull request
          </div>
          <button
            onClick={() => loadPullRequests(true)}
            disabled={loading}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Pull request ara..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white appearance-none cursor-pointer"
            >
              <option value="">Tüm Durumlar</option>
              <option value="open">Açık</option>
              <option value="closed">Kapalı</option>
              <option value="merged">Birleşti</option>
            </select>
          </div>

          {/* Repository Filter */}
          <div className="relative">
            <select
              value={repositoryFilter}
              onChange={(e) => handleRepositoryFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white appearance-none cursor-pointer"
            >
              <option value="">Tüm Depolar</option>
              {uniqueRepositories.map((repo) => (
                <option key={repo} value={repo}>{repo}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* PR Cards */}
      {!loading && (
        <div className="grid gap-4">
          {prs.length === 0 ? (
            <div className="text-center py-12">
              <GitPullRequest className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Pull request yok</h3>
              <p className="mt-1 text-sm text-gray-500">
                Kriterlerinize uyan pull request bulunamadı.
              </p>
            </div>
          ) : (
            prs.map((pr) => (
              <Link
                key={pr.id}
                to={`/pull-requests/${pr.id}`}
                className="block bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 hover:scale-[1.01] group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="flex-shrink-0">
                          <GitPullRequest className="h-5 w-5 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 truncate">
                          #{pr.number} {pr.title}
                        </h3>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(pr.status)}`}>
                          {pr.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>{pr.author}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <GitBranch className="h-4 w-4" />
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{pr.repository}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatTimeAgo(new Date(pr.created_at))}</span>
                        </div>
                      </div>

                      {pr.body && (
                        <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                          {pr.body}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                            <span>+{pr.additions || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <span className="w-3 h-3 bg-red-400 rounded-full"></span>
                            <span>-{pr.deletions || 0}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {pr.changed_files || 0} files
                          </div>
                          <div className="text-xs text-gray-500">
                            {pr.base_branch} ← {pr.head_branch}
                          </div>
                        </div>
                        
                        {pr.analysis_status && (
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                              pr.analysis_status === 'completed' ? 'bg-green-500' : 
                              pr.analysis_status === 'in_progress' ? 'bg-yellow-500 animate-pulse' : 
                              'bg-gray-400'
                            }`}></div>
                            <span className="text-xs text-gray-500 capitalize">
                              {pr.analysis_status.replace('_', ' ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

