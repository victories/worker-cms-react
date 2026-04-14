import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Shield, Globe, X, Bot, Crown, Check, Users, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useSiteStore } from '@/stores/siteStore';
import { useToast } from '@/components/ui/toast-notification';

const ROLES = ['writer', 'editor', 'admin', 'super_admin'];
const ADMIN_ROLES = ['writer', 'editor']; // roles that admin can create

const roleBadgeVariant = (role: string) => {
  switch (role) {
    case 'super_admin': return 'destructive' as const;
    case 'admin': return 'default' as const;
    case 'editor': return 'secondary' as const;
    default: return 'outline' as const;
  }
};

export function UserList() {
  const { lang, user: currentUser, startImpersonation } = useAuthStore();
  const { sites, fetchSites } = useSiteStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form, setForm] = useState({
    email: '', display_name: '', password: '', role: 'writer',
    max_sites: 0, max_editors: 0, max_writers: 0,
    ai_enabled: 0, ai_use_global: 0,
  });
  const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>([]);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);

  // Site assignment state (for super_admin separate dialog)
  const [showSiteDialog, setShowSiteDialog] = useState(false);
  const [siteUser, setSiteUser] = useState<any>(null);
  const [userSites, setUserSites] = useState<any[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);

  // Admin's own sites (for site selection in create dialog)
  const [adminSites, setAdminSites] = useState<any[]>([]);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    loadUsers();
    if (isAdmin && currentUser) {
      // Load admin's own sites for the site selection
      api.request<{ success: boolean; data: any[] }>(`/users/${currentUser.id}/sites`).then(res => {
        if (res.success) setAdminSites(res.data || []);
      });
    }
    if (isSuperAdmin) {
      fetchSites();
    }
  }, []);

  const loadUsers = async () => {
    const res = await api.getUsers();
    if (res.success) setUsers(res.data as any[]);
  };

  const openCreate = () => {
    setEditUser(null);
    setForm({
      email: '', display_name: '', password: '',
      role: isAdmin ? 'writer' : 'writer',
      max_sites: 0, max_editors: 0, max_writers: 0,
      ai_enabled: 0, ai_use_global: 0,
    });
    setSelectedSiteIds([]);
    setShowDialog(true);
  };

  const openEdit = (u: any) => {
    setEditUser(u);
    setForm({
      email: u.email, display_name: u.display_name, password: '', role: u.role,
      max_sites: u.max_sites ?? 0, max_editors: u.max_editors ?? 0, max_writers: u.max_writers ?? 0,
      ai_enabled: u.ai_enabled ?? 0, ai_use_global: u.ai_use_global ?? 0,
    });
    setSelectedSiteIds([]);
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      if (editUser) {
        const body: any = { display_name: form.display_name };
        if (form.email && form.email !== editUser.email) body.email = form.email;
        if (form.password) body.password = form.password;
        if (isSuperAdmin) {
          body.role = form.role;
          body.max_sites = form.max_sites;
          body.max_editors = form.max_editors;
          body.max_writers = form.max_writers;
          body.ai_enabled = form.ai_enabled;
          body.ai_use_global = form.ai_use_global;
        }
        await api.request(`/users/${editUser.id}`, { method: 'PUT', body });
        toast(lang === 'tr' ? 'Kullanıcı güncellendi' : 'User updated', 'success');
      } else {
        const body: any = {
          email: form.email,
          display_name: form.display_name,
          password: form.password,
          role: form.role,
        };
        if (isSuperAdmin) {
          body.max_sites = form.max_sites;
          body.max_editors = form.max_editors;
          body.max_writers = form.max_writers;
          body.ai_enabled = form.ai_enabled;
          body.ai_use_global = form.ai_use_global;
        }
        // For admin creating writer/editor, attach site_ids
        if (isAdmin || (isSuperAdmin && (form.role === 'writer' || form.role === 'editor'))) {
          body.site_ids = selectedSiteIds;
        }
        await api.request('/users', { method: 'POST', body });
        toast(lang === 'tr' ? 'Kullanıcı oluşturuldu' : 'User created', 'success');
      }
    } catch {
      toast(lang === 'tr' ? 'İşlem başarısız' : 'Operation failed', 'error');
    }
    setShowDialog(false);
    loadUsers();
  };

  const handleDelete = (id: number) => setDeleteUserId(id);

  const confirmDeleteUser = async () => {
    if (deleteUserId === null) return;
    try {
      await api.request(`/users/${deleteUserId}`, { method: 'DELETE' });
      toast(lang === 'tr' ? 'Kullanıcı silindi' : 'User deleted', 'success');
    } catch {
      toast(lang === 'tr' ? 'Silme başarısız' : 'Delete failed', 'error');
    }
    setDeleteUserId(null);
    loadUsers();
  };

  // Site assignment functions (super_admin separate dialog)
  const openSiteAssignment = async (u: any) => {
    setSiteUser(u);
    setShowSiteDialog(true);
    setLoadingSites(true);
    const res = await api.request<{ success: boolean; data: any[] }>(`/users/${u.id}/sites`);
    if (res.success) setUserSites(res.data || []);
    setLoadingSites(false);
  };

  const assignSite = async (siteId: number) => {
    if (!siteUser) return;
    try {
      await api.request(`/users/${siteUser.id}/sites`, { method: 'POST', body: { site_id: siteId } });
      toast(lang === 'tr' ? 'Site atandı' : 'Site assigned', 'success');
    } catch {
      toast(lang === 'tr' ? 'Atama başarısız' : 'Assignment failed', 'error');
    }
    const res = await api.request<{ success: boolean; data: any[] }>(`/users/${siteUser.id}/sites`);
    if (res.success) setUserSites(res.data || []);
  };

  const removeSite = async (siteId: number) => {
    if (!siteUser) return;
    try {
      await api.request(`/users/${siteUser.id}/sites/${siteId}`, { method: 'DELETE' });
      toast(lang === 'tr' ? 'Site kaldırıldı' : 'Site removed', 'success');
    } catch {
      toast(lang === 'tr' ? 'Kaldırma başarısız' : 'Remove failed', 'error');
    }
    const res = await api.request<{ success: boolean; data: any[] }>(`/users/${siteUser.id}/sites`);
    if (res.success) setUserSites(res.data || []);
  };

  // Toggle site in selection
  const toggleSite = (siteId: number) => {
    setSelectedSiteIds(prev =>
      prev.includes(siteId)
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId]
    );
  };

  // Select all sites
  const selectAllSites = () => {
    const availSites = isAdmin ? adminSites : sites;
    setSelectedSiteIds(availSites.map((s: any) => s.id));
  };

  // Deselect all sites
  const deselectAllSites = () => {
    setSelectedSiteIds([]);
  };

  // Which roles can current user assign
  const availableRoles = isSuperAdmin ? ROLES : ADMIN_ROLES;

  // Should show site selection (for writer/editor in create mode)
  const showSiteSelection = !editUser && (form.role === 'writer' || form.role === 'editor');

  // Available sites for selection
  const sitesForSelection = isAdmin ? adminSites : sites;

  const handleImpersonate = async (userId: number) => {
    const result = await startImpersonation(userId);
    if (result.success) {
      toast(lang === 'tr' ? 'Kullanıcı olarak giriş yapıldı' : 'Logged in as user', 'success');
      navigate('/');
    } else {
      toast(result.error || (lang === 'tr' ? 'Geçiş başarısız' : 'Switch failed'), 'error');
    }
  };

  const assignedSiteIds = userSites.map((s: any) => s.id);
  const availableSites = sites.filter((s: any) => !assignedSiteIds.includes(s.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('nav.users', lang)}</h1>
        {(isSuperAdmin || isAdmin) && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            {lang === 'tr' ? 'Yeni Kullanıcı' : 'New User'}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">{lang === 'tr' ? 'Ad' : 'Name'}</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">{lang === 'tr' ? 'Rol' : 'Role'}</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">{lang === 'tr' ? 'İzinler' : 'Permissions'}</th>
                <th className="text-left p-3 font-medium">{lang === 'tr' ? 'Son Giriş' : 'Last Login'}</th>
                <th className="text-right p-3 font-medium">{lang === 'tr' ? 'İşlemler' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b hover:bg-muted/30">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {u.display_name?.charAt(0)?.toUpperCase()}
                      </div>
                      <span className="font-medium">{u.display_name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3">
                    <Badge variant={roleBadgeVariant(u.role)}>
                      <Shield className="h-3 w-3 mr-1" />
                      {u.role}
                    </Badge>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {u.role === 'admin' && (
                        <>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {lang === 'tr' ? `${u.max_sites ?? 0} site` : `${u.max_sites ?? 0} sites`}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-400 text-blue-600">
                            <Users className="h-2.5 w-2.5 mr-0.5" />
                            {u.max_editors ?? 0}E / {u.max_writers ?? 0}W
                          </Badge>
                        </>
                      )}
                      {(u.role === 'admin' || u.role === 'editor' || u.role === 'writer') && (
                        <>
                          {u.ai_enabled === 1 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-400 text-purple-600">
                              <Bot className="h-2.5 w-2.5 mr-0.5" />
                              AI
                            </Badge>
                          )}
                          {u.ai_enabled === 1 && u.ai_use_global === 1 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400 text-amber-600">
                              <Crown className="h-2.5 w-2.5 mr-0.5" />
                              Global
                            </Badge>
                          )}
                        </>
                      )}
                      {u.role === 'super_admin' && (
                        <span className="text-xs text-muted-foreground">{lang === 'tr' ? 'Sınırsız' : 'Unlimited'}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {u.last_login ? formatDate(u.last_login, lang) : '-'}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      {(isSuperAdmin || isAdmin) && u.id !== currentUser?.id && !(isAdmin && (u.role === 'super_admin' || u.role === 'admin')) && (
                        <Button size="sm" variant="ghost" onClick={() => handleImpersonate(u.id)} title={lang === 'tr' ? 'Bu kullanıcı olarak giriş yap' : 'Login as this user'}>
                          <LogIn className="h-3 w-3" />
                        </Button>
                      )}
                      {isSuperAdmin && u.role !== 'super_admin' && (
                        <Button size="sm" variant="ghost" onClick={() => openSiteAssignment(u)} title={lang === 'tr' ? 'Site Ataması' : 'Site Assignment'}>
                          <Globe className="h-3 w-3" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      {u.id !== currentUser?.id && isSuperAdmin && (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(u.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Create/Edit User Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editUser
                ? (lang === 'tr' ? 'Kullanıcı Düzenle' : 'Edit User')
                : (lang === 'tr' ? 'Yeni Kullanıcı' : 'New User')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>{lang === 'tr' ? 'Görünen Ad' : 'Display Name'}</Label>
              <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            </div>
            <div>
              <Label>{editUser ? (lang === 'tr' ? 'Yeni Şifre (boş bırakın)' : 'New Password (leave empty)') : (lang === 'tr' ? 'Şifre' : 'Password')}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>

            {/* Role Selection */}
            <div>
              <Label>{lang === 'tr' ? 'Rol' : 'Role'}</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v })}
                disabled={editUser && !isSuperAdmin}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Site Selection — shown for writer/editor during creation */}
            {showSiteSelection && sitesForSelection.length > 0 && (
              <div className="border-t pt-4 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    {lang === 'tr' ? 'Site Erişimi' : 'Site Access'}
                  </Label>
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={selectAllSites}>
                      {lang === 'tr' ? 'Tümünü Seç' : 'Select All'}
                    </Button>
                    {selectedSiteIds.length > 0 && (
                      <Button type="button" size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={deselectAllSites}>
                        {lang === 'tr' ? 'Temizle' : 'Clear'}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto border rounded-md p-1">
                  {sitesForSelection.map((site: any) => {
                    const selected = selectedSiteIds.includes(site.id);
                    return (
                      <button
                        type="button"
                        key={site.id}
                        onClick={() => toggleSite(site.id)}
                        className={`w-full flex items-center gap-2 p-2 rounded text-sm text-left transition-colors ${
                          selected
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted/50 text-muted-foreground'
                        }`}
                      >
                        <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                          selected ? 'bg-primary border-primary' : 'border-input'
                        }`}>
                          {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <Globe className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-medium">{site.name}</span>
                        <Badge variant="outline" className="text-[10px] ml-auto">{site.slug}</Badge>
                      </button>
                    );
                  })}
                </div>
                {selectedSiteIds.length === 0 && (
                  <p className="text-xs text-destructive mt-1">
                    {lang === 'tr' ? 'En az bir site seçilmeli' : 'At least one site must be selected'}
                  </p>
                )}
              </div>
            )}

            {/* Package Permissions — only super_admin can set, only for admin role */}
            {isSuperAdmin && form.role === 'admin' && (
              <div className="border-t pt-4 mt-2 space-y-4">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  {lang === 'tr' ? 'Paket İzinleri' : 'Package Permissions'}
                </Label>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">{lang === 'tr' ? 'Maks. Site' : 'Max Sites'}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.max_sites}
                      onChange={(e) => setForm({ ...form, max_sites: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{lang === 'tr' ? 'Maks. Editör' : 'Max Editors'}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.max_editors}
                      onChange={(e) => setForm({ ...form, max_editors: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{lang === 'tr' ? 'Maks. Yazar' : 'Max Writers'}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.max_writers}
                      onChange={(e) => setForm({ ...form, max_writers: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {lang === 'tr' ? '0 = oluşturamaz' : '0 = cannot create'}
                </p>
              </div>
            )}

            {/* AI Permissions — super_admin sets for admin, admin inherits to their users */}
            {isSuperAdmin && (form.role === 'admin' || form.role === 'editor' || form.role === 'writer') && (
              <div className="border-t pt-4 mt-2 space-y-4">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  {lang === 'tr' ? 'AI İzinleri' : 'AI Permissions'}
                </Label>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="flex items-center gap-1.5">
                      <Bot className="h-3.5 w-3.5" />
                      {lang === 'tr' ? 'AI İçerik Botu' : 'AI Content Bot'}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {lang === 'tr' ? 'AI içerik özelliklerine erişim' : 'Access to AI content features'}
                    </p>
                  </div>
                  <Switch
                    checked={form.ai_enabled === 1}
                    onCheckedChange={(checked) => setForm({ ...form, ai_enabled: checked ? 1 : 0 })}
                  />
                </div>

                {form.ai_enabled === 1 && (
                  <div className="flex items-center justify-between ml-4 pl-4 border-l">
                    <div>
                      <Label className="flex items-center gap-1.5">
                        <Crown className="h-3.5 w-3.5" />
                        {lang === 'tr' ? 'Global AI API Kullanımı' : 'Use Global AI APIs'}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {lang === 'tr' ? 'Kapalıysa kendi API anahtarını girmeli' : 'If off, must provide own API keys'}
                      </p>
                    </div>
                    <Switch
                      checked={form.ai_use_global === 1}
                      onCheckedChange={(checked) => setForm({ ...form, ai_use_global: checked ? 1 : 0 })}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>{t('action.cancel', lang)}</Button>
            <Button
              onClick={handleSave}
              disabled={!editUser && showSiteSelection && selectedSiteIds.length === 0}
            >
              {t('action.save', lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Site Assignment Dialog (super_admin only) */}
      <Dialog open={showSiteDialog} onOpenChange={setShowSiteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {lang === 'tr' ? 'Site Ataması' : 'Site Assignment'}
                {siteUser && <span className="text-muted-foreground font-normal">— {siteUser.display_name}</span>}
              </div>
            </DialogTitle>
          </DialogHeader>

          {loadingSites ? (
            <p className="text-sm text-muted-foreground py-4">{t('common.loading', lang)}</p>
          ) : (
            <div className="space-y-4">
              {/* Assigned sites */}
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  {lang === 'tr' ? 'Atanmış Siteler' : 'Assigned Sites'}
                </Label>
                {userSites.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    {lang === 'tr' ? 'Henüz site atanmamış' : 'No sites assigned yet'}
                  </p>
                ) : (
                  <div className="space-y-1 mt-2">
                    {userSites.map((site: any) => (
                      <div key={site.id} className="flex items-center justify-between p-2 rounded border bg-background">
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">{site.name}</span>
                          <Badge variant="outline" className="text-xs">{site.slug}</Badge>
                        </div>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => removeSite(site.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available sites to assign */}
              {availableSites.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    {lang === 'tr' ? 'Site Ekle' : 'Add Site'}
                  </Label>
                  <div className="space-y-1 mt-2">
                    {availableSites.map((site: any) => (
                      <div key={site.id} className="flex items-center justify-between p-2 rounded border bg-muted/30 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{site.name}</span>
                          <Badge variant="outline" className="text-xs">{site.slug}</Badge>
                        </div>
                        <Button size="sm" variant="outline" className="h-7" onClick={() => assignSite(site.id)}>
                          <Plus className="h-3 w-3 mr-1" />
                          {lang === 'tr' ? 'Ata' : 'Assign'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSiteDialog(false)}>
              {lang === 'tr' ? 'Kapat' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteUserId !== null}
        onOpenChange={(open) => { if (!open) setDeleteUserId(null); }}
        onConfirm={confirmDeleteUser}
        title={lang === 'tr' ? 'Kullanıcıyı Sil' : 'Delete User'}
        description={lang === 'tr' ? 'Bu kullanıcı kalıcı olarak silinecek.' : 'This user will be permanently deleted.'}
        confirmLabel={lang === 'tr' ? 'Sil' : 'Delete'}
        cancelLabel={lang === 'tr' ? 'İptal' : 'Cancel'}
        variant="destructive"
      />
    </div>
  );
}
