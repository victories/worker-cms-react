import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { Button } from '@ui/button';
import { Badge } from '@ui/badge';
import { useToast } from '@ui/toast-notification';
import {
  CreditCard, Coins, ExternalLink, Check, X, RefreshCw,
  Filter, Clock, CheckCircle, XCircle, AlertCircle,
} from 'lucide-react';

interface Subscription {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  package_id: number;
  package_name: string;
  amount: number;
  payment_method: 'stripe' | 'crypto' | 'manual';
  crypto_chain: string | null;
  crypto_tx_hash: string | null;
  crypto_amount: number | null;
  billing_period: 'monthly' | 'yearly';
  status: 'active' | 'pending_crypto' | 'cancelled' | 'expired' | 'rejected' | 'upgraded';
  created_at: string;
}

type FilterTab = 'all' | 'active' | 'pending' | 'expired_cancelled';

const explorerUrls: Record<string, (hash: string) => string> = {
  ethereum: (hash) => `https://etherscan.io/tx/${hash}`,
  bsc: (hash) => `https://bscscan.com/tx/${hash}`,
  polygon: (hash) => `https://polygonscan.com/tx/${hash}`,
  arbitrum: (hash) => `https://arbiscan.io/tx/${hash}`,
  optimism: (hash) => `https://optimistic.etherscan.io/tx/${hash}`,
  avalanche: (hash) => `https://snowtrace.io/tx/${hash}`,
  solana: (hash) => `https://solscan.io/tx/${hash}`,
  tron: (hash) => `https://tronscan.org/#/transaction/${hash}`,
};

function getExplorerUrl(chain: string | null, hash: string | null): string | null {
  if (!chain || !hash) return null;
  const builder = explorerUrls[chain];
  return builder ? builder(hash) : null;
}

export function PaymentsPage() {
  const { lang } = useAuthStore();
  const { toast } = useToast();
  const tr = lang === 'tr';

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await api.request('/subscriptions/all') as any;
      if (res.success) setSubscriptions(res.data || []);
    } catch {
      toast(tr ? 'Abonelikler yüklenemedi' : 'Failed to load subscriptions', 'error');
    }
    setLoading(false);
  };

  useEffect(() => { fetchSubscriptions(); }, []);

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      const res = await api.request(`/subscriptions/${id}/approve`, { method: 'POST' }) as any;
      if (res.success) {
        toast(tr ? 'Ödeme onaylandı' : 'Payment approved', 'success');
        fetchSubscriptions();
      } else {
        toast(res.error || 'Error', 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Error', 'error');
    }
    setActionLoading(null);
  };

  const handleReject = async (id: number) => {
    setActionLoading(id);
    try {
      const res = await api.request(`/subscriptions/${id}/reject`, { method: 'POST' }) as any;
      if (res.success) {
        toast(tr ? 'Ödeme reddedildi' : 'Payment rejected', 'success');
        fetchSubscriptions();
      } else {
        toast(res.error || 'Error', 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Error', 'error');
    }
    setActionLoading(null);
  };

  const filtered = subscriptions.filter((s) => {
    switch (activeTab) {
      case 'active': return s.status === 'active';
      case 'pending': return s.status === 'pending_crypto';
      case 'expired_cancelled': return ['expired', 'cancelled', 'rejected', 'upgraded'].includes(s.status);
      default: return true;
    }
  });

  const tabs: { key: FilterTab; label: string; icon: any; count: number }[] = [
    { key: 'all', label: tr ? 'Tümü' : 'All', icon: Filter, count: subscriptions.length },
    { key: 'active', label: tr ? 'Aktif' : 'Active', icon: CheckCircle, count: subscriptions.filter((s) => s.status === 'active').length },
    { key: 'pending', label: tr ? 'Bekleyen' : 'Pending', icon: Clock, count: subscriptions.filter((s) => s.status === 'pending_crypto').length },
    { key: 'expired_cancelled', label: tr ? 'Süresi Dolmuş / Diğer' : 'Expired / Other', icon: XCircle, count: subscriptions.filter((s) => ['expired', 'cancelled', 'rejected', 'upgraded'].includes(s.status)).length },
  ];

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">{tr ? 'Aktif' : 'Active'}</Badge>;
      case 'pending_crypto':
        return <Badge variant="warning">{tr ? 'Bekliyor' : 'Pending'}</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">{tr ? 'İptal' : 'Cancelled'}</Badge>;
      case 'expired':
        return <Badge variant="destructive">{tr ? 'Süresi Dolmuş' : 'Expired'}</Badge>;
      case 'rejected':
        return <Badge variant="destructive">{tr ? 'Reddedildi' : 'Rejected'}</Badge>;
      case 'upgraded':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">{tr ? 'Yükseltildi' : 'Upgraded'}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const paymentMethodLabel = (method: string) => {
    switch (method) {
      case 'stripe': return <span className="inline-flex items-center gap-1"><CreditCard className="h-3.5 w-3.5 text-blue-500" /> Stripe</span>;
      case 'crypto': return <span className="inline-flex items-center gap-1"><Coins className="h-3.5 w-3.5 text-orange-500" /> Crypto</span>;
      case 'manual': return <span className="inline-flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5 text-gray-500" /> {tr ? 'Manuel' : 'Manual'}</span>;
      default: return method;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          {tr ? 'Ödemeler' : 'Payments'}
        </h1>
        <Button variant="outline" size="sm" onClick={fetchSubscriptions} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {tr ? 'Yenile' : 'Refresh'}
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              <span className={`ml-1 text-xs rounded-full px-1.5 py-0.5 ${
                isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 font-medium">{tr ? 'Kullanıcı' : 'User'}</th>
              <th className="text-left px-4 py-3 font-medium">{tr ? 'Paket' : 'Package'}</th>
              <th className="text-left px-4 py-3 font-medium">{tr ? 'Tutar' : 'Amount'}</th>
              <th className="text-left px-4 py-3 font-medium">{tr ? 'Ödeme Yöntemi' : 'Payment Method'}</th>
              <th className="text-left px-4 py-3 font-medium">{tr ? 'Zincir' : 'Chain'}</th>
              <th className="text-left px-4 py-3 font-medium">{tr ? 'Periyot' : 'Period'}</th>
              <th className="text-left px-4 py-3 font-medium">{tr ? 'Durum' : 'Status'}</th>
              <th className="text-left px-4 py-3 font-medium">TX Hash</th>
              <th className="text-left px-4 py-3 font-medium">{tr ? 'Tarih' : 'Date'}</th>
              <th className="text-left px-4 py-3 font-medium">{tr ? 'İşlemler' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={10} className="text-center py-12 text-muted-foreground">
                  {tr ? 'Yükleniyor...' : 'Loading...'}
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-12 text-muted-foreground">
                  {tr ? 'Kayıt bulunamadı' : 'No records found'}
                </td>
              </tr>
            )}
            {!loading && filtered.map((sub) => {
              const explorerUrl = getExplorerUrl(sub.crypto_chain, sub.crypto_tx_hash);
              return (
                <tr key={sub.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  {/* User */}
                  <td className="px-4 py-3">
                    <div className="font-medium">{sub.user_name || '-'}</div>
                    <div className="text-xs text-muted-foreground">{sub.user_email}</div>
                  </td>
                  {/* Package */}
                  <td className="px-4 py-3">
                    <Badge variant="outline">{sub.package_name}</Badge>
                  </td>
                  {/* Amount */}
                  <td className="px-4 py-3 font-semibold">
                    ${sub.crypto_amount ?? sub.amount ?? 0}
                  </td>
                  {/* Payment Method */}
                  <td className="px-4 py-3">
                    {paymentMethodLabel(sub.payment_method)}
                  </td>
                  {/* Chain */}
                  <td className="px-4 py-3">
                    {sub.crypto_chain ? (
                      <Badge variant="secondary" className="text-xs uppercase">{sub.crypto_chain}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  {/* Billing Period */}
                  <td className="px-4 py-3">
                    {sub.billing_period === 'yearly'
                      ? (tr ? 'Yıllık' : 'Yearly')
                      : (tr ? 'Aylık' : 'Monthly')}
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3">
                    {statusBadge(sub.status)}
                  </td>
                  {/* TX Hash */}
                  <td className="px-4 py-3">
                    {sub.crypto_tx_hash ? (
                      <div className="flex items-center gap-1.5 max-w-[180px]">
                        <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded truncate block" title={sub.crypto_tx_hash}>
                          {sub.crypto_tx_hash.slice(0, 8)}...{sub.crypto_tx_hash.slice(-6)}
                        </code>
                        {explorerUrl ? (
                          <a
                            href={explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-primary hover:text-primary/80"
                            title={tr ? 'Explorer\'da aç' : 'Open in explorer'}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  {/* Date */}
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(sub.created_at)}
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3">
                    {sub.status === 'pending_crypto' ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleApprove(sub.id)}
                          disabled={actionLoading === sub.id}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          {tr ? 'Onayla' : 'Approve'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-destructive"
                          onClick={() => handleReject(sub.id)}
                          disabled={actionLoading === sub.id}
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          {tr ? 'Reddet' : 'Reject'}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
