import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Badge } from '@ui/badge';
import { useToast } from '@ui/toast-notification';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@ui/dialog';
import { Crown, Check, CreditCard, Coins, Loader2, PartyPopper, Copy, ExternalLink, ArrowUp, Building2, MessageCircle } from 'lucide-react';

const CHAINS = [
  { id: 'ethereum', name: 'Ethereum (ERC-20)', icon: 'ETH' },
  { id: 'bsc', name: 'BNB Smart Chain (BEP-20)', icon: 'BSC' },
  { id: 'polygon', name: 'Polygon', icon: 'MATIC' },
  { id: 'arbitrum', name: 'Arbitrum', icon: 'ARB' },
  { id: 'optimism', name: 'Optimism', icon: 'OP' },
  { id: 'avalanche', name: 'Avalanche (C-Chain)', icon: 'AVAX' },
  { id: 'solana', name: 'Solana (SPL)', icon: 'SOL' },
  { id: 'tron', name: 'Tron (TRC-20)', icon: 'TRX' },
];

export function UpgradePage() {
  const { lang } = useAuthStore();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const tr = lang === 'tr';

  const [packages, setPackages] = useState<any[]>([]);
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<number | null>(null);

  // Crypto modal
  const [cryptoModal, setCryptoModal] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [selectedChain, setSelectedChain] = useState('');
  const [selectedToken, setSelectedToken] = useState<'usdt' | 'usdc'>('usdt');
  const [txHash, setTxHash] = useState('');
  const [cryptoSubmitting, setCryptoSubmitting] = useState(false);
  const [walletAddresses, setWalletAddresses] = useState<Record<string, Record<string, string>>>({ usdt: {}, usdc: {} });
  const [copied, setCopied] = useState(false);
  const [prorationData, setProrationData] = useState<Record<number, any>>({});

  useEffect(() => {
    fetchData();
    if (searchParams.get('success') === '1') {
      toast(tr ? '\u00d6deme ba\u015far\u0131l\u0131! Aboneli\u011finiz aktif.' : 'Payment successful! Subscription active.', 'success');
    }
  }, [billingPeriod]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pkgRes, subRes, walletRes] = await Promise.all([
        api.request('/packages') as any,
        api.request('/subscriptions/my') as any,
        api.request('/packages/wallets') as any,
      ]);
      if (pkgRes.success) setPackages(pkgRes.data);
      if (subRes.success && subRes.data) {
        setCurrentSub(subRes.data);
      } else if (pkgRes.success) {
        // No active subscription → user is on free plan
        const freePkg = pkgRes.data.find((p: any) => p.price_monthly === 0 && p.is_active === 1);
        if (freePkg) {
          setCurrentSub({ package_id: freePkg.id, package_name: freePkg.name, is_free: true });
        }
      }
      if (walletRes.success) setWalletAddresses(walletRes.data || { usdt: {}, usdc: {} });

      // Fetch proration data for each package if user has active subscription
      if (subRes.success && subRes.data) {
        const pkgs = pkgRes.success ? pkgRes.data : [];
        const prorationPromises = pkgs.map(async (pkg: any) => {
          if (pkg.id === subRes.data.package_id) return null;
          try {
            const res = await api.request(`/subscriptions/prorate?package_id=${pkg.id}&billing_period=${billingPeriod}`) as any;
            if (res.success) return { pkgId: pkg.id, data: res.data };
          } catch {}
          return null;
        });
        const results = await Promise.all(prorationPromises);
        const map: Record<number, any> = {};
        for (const r of results) {
          if (r) map[r.pkgId] = r.data;
        }
        setProrationData(map);
      }
    } catch {}
    setLoading(false);
  };

  const handleCreemCheckout = async (pkgId: number) => {
    setCheckoutLoading(pkgId);
    try {
      const res = await api.request('/subscriptions/creem-checkout', {
        method: 'POST',
        body: { package_id: pkgId, billing_period: billingPeriod },
      }) as any;
      if (res.success && res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        toast(res.error || 'Creem error', 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Error', 'error');
    }
    setCheckoutLoading(null);
  };

  const openCryptoModal = (pkg: any) => {
    setSelectedPkg(pkg);
    setSelectedToken('usdt');
    setSelectedChain('');
    setTxHash('');
    setCryptoModal(true);
  };

  const handleCryptoSubmit = async () => {
    if (!selectedPkg || !selectedChain || !txHash.trim()) return;
    setCryptoSubmitting(true);
    try {
      const res = await api.request('/subscriptions/crypto', {
        method: 'POST',
        body: {
          package_id: selectedPkg.id,
          billing_period: billingPeriod,
          chain: selectedChain,
          tx_hash: txHash.trim(),
        },
      }) as any;
      if (res.success) {
        toast(tr ? '\u00d6deme g\u00f6nderildi! Y\u00f6netici onaylad\u0131ktan sonra aktif olacak.' : 'Payment submitted! Will be active after admin approval.', 'success');
        setCryptoModal(false);
      } else {
        toast(res.error || 'Error', 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Error', 'error');
    }
    setCryptoSubmitting(false);
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPrice = (pkg: any) => billingPeriod === 'yearly' ? pkg.price_yearly : pkg.price_monthly;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Crown className="h-7 w-7 text-yellow-500" />
          {tr ? 'Plan\u0131n\u0131z\u0131 Y\u00fckseltin' : 'Upgrade Your Plan'}
        </h1>
        <p className="text-muted-foreground">
          {tr ? '\u0130htiyac\u0131n\u0131za uygun paketi se\u00e7in' : 'Choose the plan that fits your needs'}
        </p>

        {currentSub && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm">
            <Check className="h-3.5 w-3.5" />
            {tr ? `Mevcut paket: ${currentSub.package_name}` : `Current plan: ${currentSub.package_name}`}
            {currentSub.current_period_end && (
              <span className="text-xs text-muted-foreground">
                ({tr ? 'biti\u015f' : 'expires'}: {new Date(currentSub.current_period_end).toLocaleDateString()})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center bg-muted rounded-lg p-1">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${billingPeriod === 'monthly' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
            onClick={() => setBillingPeriod('monthly')}
          >
            {tr ? 'Ayl\u0131k' : 'Monthly'}
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${billingPeriod === 'yearly' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
            onClick={() => setBillingPeriod('yearly')}
          >
            {tr ? 'Y\u0131ll\u0131k' : 'Yearly'}
            <Badge variant="success" className="ml-2 text-[10px]">
              {tr ? 'Tasarruf' : 'Save'}
            </Badge>
          </button>
        </div>
      </div>

      {/* Package Cards */}
      <div className="flex flex-wrap justify-center gap-6">
        {packages.map((pkg) => {
          const price = getPrice(pkg);
          const proration = prorationData[pkg.id];
          const hasProration = proration && proration.has_active_sub && proration.credit > 0;
          let features: string[] = [];
          try { features = pkg.features ? JSON.parse(pkg.features) : []; } catch {}
          const isCurrent = currentSub?.package_id === pkg.id;
          // Check if this package is a downgrade (lower price than current)
          const currentPkgPrice = currentSub ? (billingPeriod === 'yearly'
            ? (packages.find((p: any) => p.id === currentSub.package_id)?.price_yearly || 0)
            : (packages.find((p: any) => p.id === currentSub.package_id)?.price_monthly || 0)) : 0;
          const isDowngrade = currentSub && !isCurrent && price < currentPkgPrice;

          return (
            <div key={pkg.id} className={`rounded-2xl border-2 p-6 space-y-4 transition-all ${isCurrent ? 'border-primary/40 bg-primary/5 opacity-60' : isDowngrade ? 'border-border opacity-60' : 'border-border hover:border-primary/50'}`} style={{ flex: '0 1 calc(33.333% - 18px)', minWidth: 280 }}>
              <div>
                <h3 className="text-xl font-bold">{pkg.name}</h3>
                {pkg.description && <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>}
              </div>

              <div className="flex items-baseline gap-1">
                {hasProration && !isDowngrade ? (
                  <>
                    <span className="text-4xl font-bold text-green-600">${proration.prorated_price}</span>
                    <span className="text-lg text-muted-foreground line-through ml-2">${price}</span>
                    <span className="text-muted-foreground">/{billingPeriod === 'yearly' ? (tr ? 'y\u0131l' : 'yr') : (tr ? 'ay' : 'mo')}</span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-bold">${price}</span>
                    <span className="text-muted-foreground">/{billingPeriod === 'yearly' ? (tr ? 'y\u0131l' : 'yr') : (tr ? 'ay' : 'mo')}</span>
                  </>
                )}
              </div>

              {hasProration && !isDowngrade && (
                <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-medium text-green-700 dark:text-green-400">
                    <ArrowUp className="h-3.5 w-3.5" />
                    {tr ? 'Yükseltme Kredisi' : 'Upgrade Credit'}
                  </div>
                  <div className="text-green-600 dark:text-green-500">
                    {tr
                      ? `Mevcut paketinizden ${proration.days_remaining} gün kaldı → $${proration.credit} kredi`
                      : `${proration.days_remaining} days left on current plan → $${proration.credit} credit`}
                  </div>
                </div>
              )}

              {billingPeriod === 'yearly' && pkg.price_monthly > 0 && (
                <p className="text-xs text-green-600">
                  {tr ? `Ayl\u0131k $${(pkg.price_yearly / 12).toFixed(2)} (${Math.round((1 - pkg.price_yearly / (pkg.price_monthly * 12)) * 100)}% tasarruf)`
                       : `$${(pkg.price_yearly / 12).toFixed(2)}/mo (${Math.round((1 - pkg.price_yearly / (pkg.price_monthly * 12)) * 100)}% savings)`}
                </p>
              )}

              <div className="space-y-1.5 text-sm">
                {features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
                {features.length === 0 && (
                  <>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <span>{pkg.max_sites} {tr ? 'site' : 'sites'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <span>{pkg.max_storage_mb >= 1000 ? `${(pkg.max_storage_mb / 1000).toFixed(0)} GB` : `${pkg.max_storage_mb} MB`} {tr ? 'depolama' : 'storage'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <span>{pkg.max_posts_per_site === 0 ? (tr ? 'S\u0131n\u0131rs\u0131z yaz\u0131' : 'Unlimited posts') : `${pkg.max_posts_per_site} ${tr ? 'yaz\u0131/site' : 'posts/site'}`}</span>
                    </div>
                  </>
                )}
              </div>

              {isCurrent ? (
                <Button className="w-full opacity-70" variant="outline" disabled>
                  <Check className="h-4 w-4 mr-2" />
                  {tr ? 'Zaten Bu Pakete Abonesiniz' : 'You Are On This Plan'}
                </Button>
              ) : isDowngrade ? (
                <Button className="w-full" variant="outline" disabled>
                  {tr ? 'Mevcut paketiniz daha yüksek' : 'Your current plan is higher'}
                </Button>
              ) : (
                <div className="space-y-2">
                  {pkg.creem_product_monthly_id && (
                    <Button
                      className="w-full"
                      onClick={() => handleCreemCheckout(pkg.id)}
                      disabled={checkoutLoading === pkg.id}
                    >
                      {checkoutLoading === pkg.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      {tr ? 'Kredi Kart\u0131 ile \u00d6de' : 'Pay with Card'}
                    </Button>
                  )}
                  {pkg.crypto_enabled === 1 && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => openCryptoModal(pkg)}
                    >
                      <Coins className="h-4 w-4 mr-2" />
                      {tr ? 'Crypto ile \u00d6de (USDT/USDC)' : 'Pay with Crypto (USDT/USDC)'}
                    </Button>
                  )}
                  {!pkg.creem_product_monthly_id && pkg.crypto_enabled !== 1 && (
                    <Button className="w-full" variant="outline" disabled>
                      {tr ? '\u00d6deme se\u00e7ene\u011fi yok' : 'No payment option'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Enterprise / Contact Card */}
        <div className="rounded-2xl border-2 border-dashed border-violet-300 dark:border-violet-700 p-6 space-y-4 transition-all hover:border-violet-500 bg-gradient-to-br from-violet-50/50 to-transparent dark:from-violet-950/20" style={{ flex: '0 1 calc(33.333% - 18px)', minWidth: 280 }}>
          <div>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950/60">
                <Building2 className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
              </div>
              <h3 className="text-xl font-bold">{tr ? 'Kurumsal' : 'Enterprise'}</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {tr
                ? 'Mevcut paketler ihtiyacınızı karşılamıyor mu? Size özel bir çözüm sunalım.'
                : "Need more than our standard plans? Let's build a custom solution for you."}
            </p>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-violet-600 dark:text-violet-400">{tr ? 'Özel Fiyat' : 'Custom'}</span>
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-violet-500 shrink-0" />
              <span>{tr ? 'Sınırsız site' : 'Unlimited sites'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-violet-500 shrink-0" />
              <span>{tr ? 'Sınırsız depolama' : 'Unlimited storage'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-violet-500 shrink-0" />
              <span>{tr ? 'Öncelikli destek' : 'Priority support'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-violet-500 shrink-0" />
              <span>{tr ? 'Özel entegrasyonlar' : 'Custom integrations'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-violet-500 shrink-0" />
              <span>{tr ? 'SLA garantisi' : 'SLA guarantee'}</span>
            </div>
          </div>

          <Button
            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
            onClick={() => window.location.href = '/iletisim'}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {tr ? 'Bizimle İletişime Geçin' : 'Contact Us'}
          </Button>
        </div>
      </div>

      {/* Crypto Payment Modal */}
      <Dialog open={cryptoModal} onOpenChange={setCryptoModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              {tr ? 'Crypto \u00d6deme' : 'Crypto Payment'}
            </DialogTitle>
          </DialogHeader>

          {selectedPkg && (() => {
            const modalProration = prorationData[selectedPkg.id];
            const modalHasProration = modalProration && modalProration.has_active_sub && modalProration.credit > 0;
            const displayPrice = modalHasProration ? modalProration.prorated_price : getPrice(selectedPkg);
            const tokenWallets = walletAddresses[selectedToken] || {};
            const walletAddress = selectedChain ? tokenWallets[selectedChain] : '';
            return (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted text-sm">
                <div className="font-medium">{selectedPkg.name}</div>
                <div className="text-muted-foreground">
                  {modalHasProration ? (
                    <>
                      <span className="font-semibold text-green-600">${displayPrice}</span>
                      <span className="line-through ml-1 text-xs">${getPrice(selectedPkg)}</span>
                    </>
                  ) : (
                    <>${getPrice(selectedPkg)}</>
                  )}
                  {' '}{selectedToken.toUpperCase()} &bull; {billingPeriod === 'yearly' ? (tr ? 'Y\u0131ll\u0131k' : 'Yearly') : (tr ? 'Ayl\u0131k' : 'Monthly')}
                </div>
                {modalHasProration && (
                  <div className="text-xs text-green-600 mt-1">
                    {tr
                      ? `Mevcut paketinizden $${modalProration.credit} kredi düşüldü`
                      : `$${modalProration.credit} credit applied from current plan`}
                  </div>
                )}
              </div>

              {/* Token selection: USDT / USDC */}
              <div>
                <label className="text-sm font-medium mb-2 block">{tr ? 'Token Seçin' : 'Select Token'}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['usdt', 'usdc'] as const).map((token) => {
                    const hasAny = Object.keys(walletAddresses[token] || {}).length > 0;
                    return (
                      <button
                        key={token}
                        onClick={() => { setSelectedToken(token); setSelectedChain(''); }}
                        disabled={!hasAny}
                        className={`px-4 py-3 rounded-lg border text-center transition-all ${
                          selectedToken === token
                            ? 'border-primary bg-primary/10 font-semibold'
                            : hasAny ? 'hover:border-primary/50' : 'opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <div className="text-lg font-bold">{token.toUpperCase()}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {token === 'usdt' ? 'Tether' : 'USD Coin'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chain selection - only show chains with wallet addresses for selected token */}
              {(() => {
                const availableChains = CHAINS.filter((chain) => !!tokenWallets[chain.id]);
                if (availableChains.length === 0) {
                  return (
                    <div className="p-4 rounded-lg border border-dashed text-center text-sm text-muted-foreground">
                      {tr
                        ? `${selectedToken.toUpperCase()} için yapılandırılmış ağ bulunamadı.`
                        : `No networks configured for ${selectedToken.toUpperCase()}.`}
                    </div>
                  );
                }
                return (
                  <div>
                    <label className="text-sm font-medium mb-2 block">{tr ? 'Ağ Seçin' : 'Select Network'}</label>
                    <div className={`grid gap-2 ${availableChains.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {availableChains.map((chain) => (
                        <button
                          key={chain.id}
                          onClick={() => setSelectedChain(chain.id)}
                          className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                            selectedChain === chain.id
                              ? 'border-primary bg-primary/10 font-medium'
                              : 'hover:border-primary/50'
                          }`}
                        >
                          <div className="font-semibold">{chain.icon}</div>
                          <div className="text-muted-foreground">{chain.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Wallet address */}
              {selectedChain && walletAddress && (
                <div>
                  <label className="text-sm font-medium mb-1 block">{tr ? 'Gönderim Adresi' : 'Send To'}</label>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <code className="text-xs flex-1 break-all">{walletAddress}</code>
                    <button onClick={() => copyAddress(walletAddress)} className="shrink-0 p-1.5 hover:bg-background rounded">
                      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tr ? `$${displayPrice} ${selectedToken.toUpperCase()} gönderin` : `Send $${displayPrice} ${selectedToken.toUpperCase()}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tr ? 'Gönderdikten sonra TX Hash\'i aşağıya yazarak bize bildirim gönderebilirsiniz.' : 'After sending, paste your TX Hash below to notify us.'}
                  </p>
                </div>
              )}

              {/* TX Hash */}
              {selectedChain && (
                <div>
                  <label className="text-sm font-medium mb-1 block">{tr ? 'İşlem Hash (TX Hash)' : 'Transaction Hash'}</label>
                  <Input
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="0x..."
                    className="font-mono text-xs"
                  />
                </div>
              )}
            </div>
          ); })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCryptoModal(false)}>{tr ? '\u0130ptal' : 'Cancel'}</Button>
            <Button onClick={handleCryptoSubmit} disabled={!selectedChain || !txHash.trim() || cryptoSubmitting}>
              {cryptoSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              {tr ? 'Ödeme Tamamlandı' : 'Payment Completed'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
