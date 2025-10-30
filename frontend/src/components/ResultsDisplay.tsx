import type { Finding } from '../types';

interface ResultsDisplayProps {
  findings: Finding[];
  status: string;
  report?: string;
  error?: string;
}

export function ResultsDisplay({ findings, status, report, error }: ResultsDisplayProps) {
  const isRunning = status === 'ANALYSIS_STARTED' || status === 'ANALYSIS_RUNNING' || status === 'ANALYSIS_PROCESSING';
  const isComplete = status === 'ANALYSIS_COMPLETE';
  const isFailed = status === 'ANALYSIS_FAILED';

  return (
    <section className="bg-white rounded-lg shadow border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Analiz Sonuçları</h2>
        <span className="text-sm text-gray-600">Durum: {status}</span>
      </div>
      <div className="p-4 space-y-4">
        {isRunning && (
          <p className="text-gray-500">Analiz süreci başlatıldı, LLM uzmanları çalışıyor...</p>
        )}

        {isFailed && (
          <div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3">
            <p className="font-medium">Analiz başarısız oldu.</p>
            {error ? <p className="mt-1 text-sm">Hata: {error}</p> : null}
          </div>
        )}

        {isComplete && report && (
          <details className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <summary className="cursor-pointer font-medium text-gray-800">Markdown Raporu</summary>
            <pre className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{report}</pre>
          </details>
        )}

        {isComplete && (!findings || findings.length === 0) && (
          <p className="text-gray-500">Herhangi bir bulgu bulunamadı.</p>
        )}

        {findings && findings.length > 0 && (
          <ul className="space-y-2">
            {findings.map((f, idx) => (
              <li key={idx} className="border border-gray-200 rounded-md p-3">
                <div className="text-xs text-gray-500 mb-1">
                  Satır {f.line} • {f.type} • Güven: {f.confidence}
                </div>
                <div className="text-gray-800">{f.message}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}