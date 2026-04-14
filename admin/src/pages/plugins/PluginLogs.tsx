import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';

interface LogEntry {
  id: number;
  hook: string;
  duration_ms: number;
  status: 'success' | 'error' | 'timeout';
  error_message: string | null;
  created_at: string;
}

interface LogStats {
  total_calls: number;
  avg_duration_ms: number;
  error_count: number;
  timeout_count: number;
  error_rate: number;
}

export default function PluginLogs() {
  const { slug } = useParams<{ slug: string }>();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.getPluginLogs(slug, days).then((res: any) => {
      if (res.success) {
        setLogs(res.data.logs);
        setStats(res.data.stats);
      }
    }).finally(() => setLoading(false));
  }, [slug, days]);

  const statusColor: Record<string, string> = {
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    timeout: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{slug} - Calisma Loglari</h1>
          <Link to="/plugins" className="text-sm text-blue-600 hover:underline">
            &larr; Eklentilere Don
          </Link>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value={1}>Son 1 gun</option>
          <option value={7}>Son 7 gun</option>
          <option value={30}>Son 30 gun</option>
        </select>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">Toplam Cagri</div>
            <div className="text-2xl font-bold">{stats.total_calls}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">Ort. Sure</div>
            <div className="text-2xl font-bold">{stats.avg_duration_ms}ms</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">Hata Sayisi</div>
            <div className="text-2xl font-bold text-red-600">{stats.error_count}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">Hata Orani</div>
            <div className="text-2xl font-bold">{stats.error_rate}%</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Yukleniyor...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Henuz log yok</div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2">Tarih</th>
                <th className="text-left px-4 py-2">Hook</th>
                <th className="text-left px-4 py-2">Sure</th>
                <th className="text-left px-4 py-2">Durum</th>
                <th className="text-left px-4 py-2">Hata</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-600">
                    {new Date(log.created_at).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{log.hook}</td>
                  <td className="px-4 py-2">{log.duration_ms}ms</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${statusColor[log.status] || ''}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-red-600 text-xs truncate max-w-xs">
                    {log.error_message || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
