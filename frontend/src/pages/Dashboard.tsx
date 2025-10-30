import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  GitPullRequest, 
  GitMerge, 
  GitBranch, 
  Activity, 
  Clock, 
  TrendingUp,
  ArrowRight,
  AlertCircle,
  Settings
} from 'lucide-react';
import { dashboardApi, DashboardStats } from '../services/api';
import { formatNumber, formatTimeAgo, getSeverityColor } from '../utils/formatters';
import { useWebSocket } from '../hooks/useWebSocket';
import { CardSkeleton } from '../components/LoadingSkeleton';


export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isConnected, events } = useWebSocket();
  // Repo tarama state kaldırıldı (Dashboard’dan tamamen çıkarıldı)

  // Analysis state is handled globally in App.tsx via ResultsDisplay



  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardApi.getStats();
      setStats(data);
    } catch (err) {
      setError('Failed to load dashboard stats');
      console.error('Dashboard stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  // parseOwnerRepo kaldırıldı (Repo tarama paneli silindi)

  // handleScan kaldırıldı (Repo tarama işlevi Dashboard’dan çıkartıldı)

  if (loading) {
    return (
      <div className="space-y-6 md:space-y-8 animate-fade-in responsive-padding safe-area-top safe-area-bottom">
        {/* Header Skeleton */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="space-y-2">
            <div className="skeleton-text-lg w-48"></div>
            <div className="skeleton-text w-64"></div>
          </div>
          <div className="skeleton-button w-32"></div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>

        {/* Performance Metrics Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>

        {/* Quick Actions Skeleton */}
        <CardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="mt-2 text-sm text-red-700">{error}</p>
            <button
              onClick={loadStats}
              className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total PRs',
      value: stats?.total_prs || 0,
      icon: GitPullRequest,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Open PRs',
      value: stats?.open_prs || 0,
      icon: GitBranch,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Merged PRs',
      value: stats?.merged_prs || 0,
      icon: GitMerge,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Analyses',
      value: stats?.total_analyses || 0,
      icon: Activity,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in responsive-padding safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Panel</h1>
          <p className="text-gray-600 text-base sm:text-lg">Repo analizi odaklı genel görünüm</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-3 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 ${
            isConnected 
              ? 'bg-green-50 text-green-700 border border-green-200 shadow-sm' 
              : 'bg-red-50 text-red-700 border border-red-200 shadow-sm'
          }`}>
            <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full animate-pulse ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span>{isConnected ? 'Bağlı' : 'Bağlantı Kesik'}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-all duration-200 hover:scale-[1.02] group touch-friendly">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">{card.title}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{formatNumber(card.value)}</p>
                </div>
                <div className={`p-2 sm:p-3 ${card.bgColor} rounded-xl group-hover:opacity-80 transition-opacity duration-200`}>
                  <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${card.color}`} />
                </div>
              </div>
              {/* Simülatif trend kaldırıldı */}
            </div>
          );
        })}
      </div>




      {/* Performance Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        <div className="card hover-lift">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Repo Performansı</h3>
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          </div>
          <div className="mt-3 sm:mt-4 space-y-2">
            {stats?.repo_metrics ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-gray-500">Toplam Satır</span>
                    <span className="text-xs sm:text-sm font-medium text-gray-900">{formatNumber(stats.repo_metrics.total_lines)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-gray-500">Dosya</span>
                    <span className="text-xs sm:text-sm font-medium text-gray-900">{formatNumber(stats.repo_metrics.files_analyzed)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-gray-500">Ort. Satır/Dosya</span>
                    <span className="text-xs sm:text-sm font-medium text-gray-900">{stats.repo_metrics.avg_lines_per_file}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-gray-500">Yorum Oranı</span>
                    <span className="text-xs sm:text-sm font-medium text-gray-900">{(stats.repo_metrics.comment_ratio * 100).toFixed(1)}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="bg-green-50 rounded-md p-2 text-center">
                    <p className="text-xs text-gray-500">Verimlilik</p>
                    <p className="text-sm font-semibold text-gray-900">{stats.repo_metrics.efficiency_score}</p>
                  </div>
                  <div className="bg-blue-50 rounded-md p-2 text-center">
                    <p className="text-xs text-gray-500">Güvenlik</p>
                    <p className="text-sm font-semibold text-gray-900">{stats.repo_metrics.security_score}</p>
                  </div>
                  <div className="bg-orange-50 rounded-md p-2 text-center">
                    <p className="text-xs text-gray-500">Performans</p>
                    <p className="text-sm font-semibold text-gray-900">{stats.repo_metrics.performance_score}</p>
                  </div>
                </div>
                {stats.repo_metrics.suggestions?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs sm:text-sm text-gray-700 font-medium mb-2">Öneriler</p>
                    <ul className="list-disc list-inside space-y-1">
                      {stats.repo_metrics.suggestions.map((s, i) => (
                        <li key={i} className="text-xs sm:text-sm text-gray-700">{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs sm:text-sm text-gray-500">Henüz bir repo taraması yapılmadı</p>
            )}
          </div>
        </div>

        <div className="card hover-lift">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Recent Activity</h3>
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          </div>
          <div className="mt-3 sm:mt-4">
            <p className="text-xs sm:text-sm text-gray-500">
              {events.length > 0 
                ? `${events.length} recent events` 
                : 'No recent events'
              }
            </p>
            {events.length > 0 && (
              <Link
                to="/events"
                className="mt-2 inline-flex items-center text-xs sm:text-sm text-blue-600 hover:text-blue-500 focus-ring rounded-md px-1 py-0.5 touch-friendly"
              >
                Tüm olayları görüntüle
                <ArrowRight className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Recent Events */}
      {events.length > 0 && (
        <div className="card hover-lift">
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">En Son Olaylar</h3>
            <Link
              to="/events"
              className="text-xs sm:text-sm text-blue-600 hover:text-blue-500 focus-ring rounded-md px-2 py-1 touch-friendly self-start sm:self-auto"
            >
              Tümünü görüntüle
            </Link>
          </div>
          <div className="space-y-3">
            {events.slice(0, 5).map((event) => (
              <div key={event.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0 touch-friendly">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${getSeverityColor(event.type)}`} />
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-900">{event.type}</p>
                    <p className="text-xs text-gray-500">{event.repository}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500 ml-2">
                  {formatTimeAgo(new Date(event.timestamp))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card hover-lift">
        <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Hızlı İşlemler</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Link
            to="/prs"
            className="flex items-center justify-center px-3 sm:px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors touch-friendly focus-ring"
          >
            <GitPullRequest className="h-4 w-4 mr-2" />
            PR'leri Görüntüle
          </Link>
          <Link
            to="/scan"
            className="flex items-center justify-center px-3 sm:px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors touch-friendly focus-ring"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Repo Tarama
          </Link>
          <Link
            to="/events"
            className="flex items-center justify-center px-3 sm:px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors touch-friendly focus-ring"
          >
            <Activity className="h-4 w-4 mr-2" />
            Olayları Görüntüle
          </Link>
          <Link
            to="/settings"
            className="flex items-center justify-center px-3 sm:px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors touch-friendly focus-ring"
          >
            <Settings className="h-4 w-4 mr-2" />
            Ayarlar
          </Link>
        </div>
      </div>
    </div>
  );
}
