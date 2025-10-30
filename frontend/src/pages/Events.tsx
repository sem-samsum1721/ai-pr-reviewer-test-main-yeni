import { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  RefreshCw,
  Trash2,
  Filter,
  GitPullRequest,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';
import { eventsApi } from '../services/api';
import { formatTimeAgo } from '../utils/formatters';
import { useWebSocket } from '../hooks/useWebSocket';
import { ListSkeleton, CardSkeleton } from '../components/LoadingSkeleton';
import { WebhookEvent } from '../types';

export function Events() {
  const [apiEvents, setApiEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const { isConnected, events: liveEvents, clearEvents } = useWebSocket();

  // Combine API events and live events
  const allEvents = [...liveEvents, ...apiEvents].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Filter events by type
  const filteredEvents = typeFilter 
    ? allEvents.filter(event => event.type === typeFilter)
    : allEvents;

  // Get unique event types for filter
  const uniqueTypes = [...new Set(allEvents.map(event => event.type))];

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await eventsApi.getAll({ limit: 100 });
      setApiEvents(data);
    } catch (err) {
      setError('Failed to load events');
      console.error('Events error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearEvents = () => {
    clearEvents();
    setApiEvents([]);
  };

  const getEventIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pull_request':
        return GitPullRequest;
      case 'webhook':
        return Activity;
      default:
        return Activity;
    }
  };

  const getEventColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pull_request':
        return 'text-blue-600';
      case 'webhook':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 md:space-y-8 animate-fade-in responsive-padding safe-area-top safe-area-bottom">
        {/* Header Skeleton */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="space-y-2">
            <div className="skeleton-text-lg w-32"></div>
            <div className="skeleton-text w-48"></div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="skeleton-button w-24"></div>
            <div className="skeleton-button w-20"></div>
            <div className="skeleton-button w-20"></div>
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>

        {/* Filter Skeleton */}
        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
          <div className="skeleton-button w-32"></div>
          <div className="skeleton-button w-24"></div>
        </div>

        {/* Events List Skeleton */}
        <ListSkeleton />
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
              onClick={loadEvents}
              className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-white to-gray-50 rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Events</h1>
            <p className="text-gray-600 text-lg">
              Real-time webhook events and system activity
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Enhanced Connection Status */}
            <div className={`flex items-center space-x-3 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              isConnected 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {isConnected ? (
                <Wifi className="h-5 w-5 animate-pulse" />
              ) : (
                <WifiOff className="h-5 w-5" />
              )}
              <span className="font-semibold">{isConnected ? 'Canlı Bağlı' : 'Bağlantı Kesik'}</span>
            </div>
            
            {/* Enhanced Actions */}
            <button
              onClick={loadEvents}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-300'}`} />
              <span className="font-medium">Yenile</span>
            </button>
            
            <button
              onClick={handleClearEvents}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 group"
            >
              <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
              <span className="font-medium">Temizle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-500 mb-1">Toplam Olay</p>
              <p className="text-3xl font-bold text-gray-900">
                {allEvents.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <Wifi className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-500 mb-1">Canlı Olay</p>
              <div className="flex items-center space-x-2">
                <p className="text-3xl font-bold text-gray-900">
                  {liveEvents.length}
                </p>
                {liveEvents.length > 0 && (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Filter className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-500 mb-1">Olay Türleri</p>
              <p className="text-3xl font-bold text-gray-900">
                {uniqueTypes.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg flex items-center justify-center">
              <Filter className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Filtreler</h3>
          </div>
          <div className="flex-1 flex items-center space-x-4">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex-1 max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              <option value="">Tüm Olay Türleri</option>
              {uniqueTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {typeFilter && (
              <button
                onClick={() => setTypeFilter('')}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                Filtreyi temizle
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Events List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              Olay Günlüğü
            </h3>
            <span className="bg-gray-100 text-gray-800 text-sm font-medium px-3 py-1 rounded-full">
              {filteredEvents.length} olay
            </span>
          </div>
          {liveEvents.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-lg border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="font-medium">Canlı güncellemeler aktif</span>
            </div>
          )}
        </div>

        {loading && filteredEvents.length === 0 ? (
           <div className="flex items-center justify-center h-32">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
           </div>
         ) : filteredEvents.length === 0 ? (
           <div className="text-center py-12">
             <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <Activity className="h-8 w-8 text-gray-400" />
             </div>
             <h3 className="text-lg font-semibold text-gray-900 mb-2">Olay bulunamadı</h3>
             <p className="text-gray-500">
               {typeFilter 
                 ? `"${typeFilter}" türü için olay bulunamadı`
                 : 'Henüz olay kaydedilmedi. Olaylar gerçekleştiğinde burada görünecek.'
               }
             </p>
           </div>
         ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredEvents.map((event) => {
              const EventIcon = getEventIcon(event.type);
              const isLiveEvent = liveEvents.some(e => e.id === event.id);
              
              return (
                <div 
                  key={event.id} 
                  className={`flex items-start space-x-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-sm ${
                    isLiveEvent 
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 animate-fade-in' 
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                    isLiveEvent 
                      ? 'bg-gradient-to-br from-green-500 to-green-600' 
                      : 'bg-white border border-gray-200'
                  }`}>
                    <EventIcon className={`h-5 w-5 ${
                      isLiveEvent ? 'text-white' : getEventColor(event.type)
                    }`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-semibold text-gray-900">
                          {event.type}
                        </span>
                        {isLiveEvent && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                            🔴 Live
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                         <Clock className="h-3 w-3" />
                         <span className="font-medium">{formatTimeAgo(new Date(event.timestamp))}</span>
                       </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600 font-medium mb-2">{event.repository}</p>
                      {event.payload && (
                        <div className="mt-3 text-xs text-gray-600 font-mono bg-white p-3 rounded-lg border border-gray-200 overflow-x-auto">
                          <pre className="whitespace-pre-wrap">{JSON.stringify(event.payload, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
