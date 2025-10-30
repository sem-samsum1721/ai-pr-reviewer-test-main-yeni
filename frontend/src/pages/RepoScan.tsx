import { useState } from 'react';
import { Key, Shield, Zap, CheckCircle, AlertCircle, Target, Percent, Clock, Package } from 'lucide-react';
import { repoScanApi } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

export function RepoScan() {
  const [repoUrl, setRepoUrl] = useState('');
  const [security, setSecurity] = useState(true);
  const [performance, setPerformance] = useState(true);
  const [comprehensive, setComprehensive] = useState(false);
  
  // Yeni güvenlik metrikleri
  const [vulnerabilityDensity, setVulnerabilityDensity] = useState(false);
  const [securityCoverage, setSecurityCoverage] = useState(false);
  const [ruleCompliance, setRuleCompliance] = useState(false);
  const [dependencySecurity, setDependencySecurity] = useState(false);
  const [testCoverage, setTestCoverage] = useState(false);
  const [patchLatency, setPatchLatency] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isConnected, events } = useWebSocket();

  const parseOwnerRepo = (url: string) => {
    const match = url.match(/github\.com\/(.*?)\/(.*?)(?:\/|$)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  };

  const handleScan = async () => {
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      const parsed = parseOwnerRepo(repoUrl);
      if (!parsed) {
        setError('Geçerli bir GitHub repo URL\'si girin');
        setLoading(false);
        return;
      }

      const payload = {
        repoUrl,
        owner: parsed.owner,
        repo: parsed.repo,
        options: { 
          security, 
          performance, 
          comprehensive,
          vulnerabilityDensity,
          securityCoverage,
          ruleCompliance,
          dependencySecurity,
          testCoverage,
          patchLatency
        },
      };
      await repoScanApi.scan(payload);
      setSuccess('Tarama başlatıldı');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Tarama başlatılamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-gray-900">Repo Tarama</h1>
        <p className="text-gray-600">Depo URL’sini girin ve tarama seçeneklerini seçin</p>
      </div>

      <div className="card space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">GitHub Repo URL</label>
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="input"
          />
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Temel Tarama Seçenekleri</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={security} onChange={(e) => setSecurity(e.target.checked)} />
              <span className="flex items-center space-x-2"><Shield className="h-4 w-4" /> <span>Güvenlik</span></span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={performance} onChange={(e) => setPerformance(e.target.checked)} />
              <span className="flex items-center space-x-2"><Zap className="h-4 w-4" /> <span>Performans</span></span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={comprehensive} onChange={(e) => setComprehensive(e.target.checked)} />
              <span className="flex items-center space-x-2"><Key className="h-4 w-4" /> <span>Kapsamlı</span></span>
            </label>
          </div>

          <h3 className="text-lg font-medium text-gray-900 mb-3">Gelişmiş Güvenlik Metrikleri</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={vulnerabilityDensity} onChange={(e) => setVulnerabilityDensity(e.target.checked)} />
              <span className="flex items-center space-x-2"><Target className="h-4 w-4" /> <span>Zafiyet Yoğunluğu</span></span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={securityCoverage} onChange={(e) => setSecurityCoverage(e.target.checked)} />
              <span className="flex items-center space-x-2"><Percent className="h-4 w-4" /> <span>Güvenlik Kapsamı %</span></span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={ruleCompliance} onChange={(e) => setRuleCompliance(e.target.checked)} />
              <span className="flex items-center space-x-2"><CheckCircle className="h-4 w-4" /> <span>Kural Uyum Oranı</span></span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={dependencySecurity} onChange={(e) => setDependencySecurity(e.target.checked)} />
              <span className="flex items-center space-x-2"><Package className="h-4 w-4" /> <span>Bağımlılık Güvenliği</span></span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={testCoverage} onChange={(e) => setTestCoverage(e.target.checked)} />
              <span className="flex items-center space-x-2"><Shield className="h-4 w-4" /> <span>Test Kapsamı</span></span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={patchLatency} onChange={(e) => setPatchLatency(e.target.checked)} />
              <span className="flex items-center space-x-2"><Clock className="h-4 w-4" /> <span>Yama Gecikmesi</span></span>
            </label>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button onClick={handleScan} disabled={loading} className="btn-primary">
            {loading ? 'Başlatılıyor...' : 'Repoyu Tara'}
          </button>
          <div className="text-sm text-gray-600">WS: {isConnected ? 'bağlı' : 'bağlı değil'}</div>
        </div>

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
      </div>

      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Canlı Olaylar</h3>
        <div className="space-y-2 max-h-64 overflow-auto">
          {events.map((ev, idx) => (
            <div key={idx} className="flex items-center justify-between border rounded p-2">
              <div className="text-sm text-gray-800">{ev.message}</div>
              <div className="text-xs text-gray-500">{ev.timestamp}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}