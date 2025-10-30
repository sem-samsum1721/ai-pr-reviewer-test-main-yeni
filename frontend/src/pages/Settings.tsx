import { useEffect, useState } from 'react';
import { 
  Save, 
  Key, 
  GitBranch, 
  Settings as SettingsIcon,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { settingsApi, repositoriesApi } from '../services/api';
import { Settings as SettingsType, Repository } from '../types';

export function Settings() {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [settingsData, reposData] = await Promise.all([
        settingsApi.get(),
        repositoriesApi.getAll().catch(() => []), // Repositories might not be available
      ]);
      
      setSettings(settingsData);
      setRepositories(reposData);
    } catch (err) {
      setError('Failed to load settings');
      console.error('Settings error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      await settingsApi.update(settings);
      setSuccess('Settings saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to save settings');
      console.error('Save settings error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof SettingsType, value: any) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      [field]: value,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="mt-2 text-sm text-red-700">{error}</p>
            <button
              onClick={loadData}
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ayarlar</h1>
          <p className="mt-1 text-sm text-gray-500">
            AI PR İnceleyici sisteminizi yapılandırın
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !settings}
          className="btn-primary flex items-center space-x-2"
        >
          {saving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {settings && (
        <div className="space-y-6">
          {/* API Configuration */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-6">
              <Key className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">API Yapılandırması</h3>
            </div>

            <div className="space-y-4">
              {/* GitHub API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GitHub API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={settings.github_api_key || ''}
                    onChange={(e) => handleInputChange('github_api_key', e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  GitHub personal access token with repo permissions
                </p>
              </div>

              {/* OpenAI API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OpenAI API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={settings.openai_api_key || ''}
                    onChange={(e) => handleInputChange('openai_api_key', e.target.value)}
                    placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
                    className="input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  OpenAI API key for LLM analysis
                </p>
              </div>

              {/* Webhook Secret */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Webhook Secret
                </label>
                <div className="relative">
                  <input
                    type={showWebhookSecret ? 'text' : 'password'}
                    value={settings.webhook_secret || ''}
                    onChange={(e) => handleInputChange('webhook_secret', e.target.value)}
                    placeholder="your-webhook-secret"
                    className="input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showWebhookSecret ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Secret for validating GitHub webhook requests
                </p>
              </div>
            </div>
          </div>

          {/* Repository Configuration */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-6">
              <GitBranch className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-medium text-gray-900">Repository Configuration</h3>
            </div>

            <div className="space-y-4">
              {/* Default Repository */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Repository
                </label>
                <select
                  value={settings.default_repository || ''}
                  onChange={(e) => handleInputChange('default_repository', e.target.value)}
                  className="input"
                >
                  <option value="">Select a repository</option>
                  {repositories.map((repo) => (
                    <option key={repo.id} value={repo.full_name}>
                      {repo.full_name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Default repository for PR analysis
                </p>
              </div>

              {/* Auto Analysis */}
              <div className="flex items-center">
                <input
                  id="auto-analysis"
                  type="checkbox"
                  checked={settings.auto_analysis || false}
                  onChange={(e) => handleInputChange('auto_analysis', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="auto-analysis" className="ml-2 block text-sm text-gray-900">
                  Enable automatic PR analysis
                </label>
              </div>
              <p className="text-sm text-gray-500 ml-6">
                Automatically analyze PRs when they are opened or updated
              </p>
            </div>
          </div>

          {/* Analysis Configuration */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-6">
              <SettingsIcon className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-medium text-gray-900">Analysis Configuration</h3>
            </div>

            <div className="space-y-4">
              {/* Analysis Options */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    id="enable-security"
                    type="checkbox"
                    checked={settings.enable_security_analysis || false}
                    onChange={(e) => handleInputChange('enable_security_analysis', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enable-security" className="ml-2 block text-sm text-gray-900">
                    Enable security analysis
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    id="enable-performance"
                    type="checkbox"
                    checked={settings.enable_performance_analysis || false}
                    onChange={(e) => handleInputChange('enable_performance_analysis', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enable-performance" className="ml-2 block text-sm text-gray-900">
                    Enable performance analysis
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    id="enable-tests"
                    type="checkbox"
                    checked={settings.enable_test_suggestions || false}
                    onChange={(e) => handleInputChange('enable_test_suggestions', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enable-tests" className="ml-2 block text-sm text-gray-900">
                    Enable test suggestions
                  </label>
                </div>
              </div>

              {/* Max File Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max File Size for Analysis (KB)
                </label>
                <input
                  type="number"
                  value={settings.max_file_size || 1000}
                  onChange={(e) => handleInputChange('max_file_size', parseInt(e.target.value))}
                  min="100"
                  max="10000"
                  className="input"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Maximum file size to analyze (in kilobytes)
                </p>
              </div>
            </div>
          </div>

          {/* Notification Configuration */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-6">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="email-notifications"
                  type="checkbox"
                  checked={settings.email_notifications || false}
                  onChange={(e) => handleInputChange('email_notifications', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="email-notifications" className="ml-2 block text-sm text-gray-900">
                  Enable email notifications
                </label>
              </div>

              {settings.email_notifications && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notification Email
                  </label>
                  <input
                    type="email"
                    value={settings.notification_email || ''}
                    onChange={(e) => handleInputChange('notification_email', e.target.value)}
                    placeholder="admin@company.com"
                    className="input"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}