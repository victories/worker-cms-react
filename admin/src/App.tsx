import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useSiteStore } from '@/stores/siteStore';
import { useThemeStore } from '@/stores/themeStore';
import { ToastProvider } from '@ui/toast-notification';
import { MainLayout } from '@/components/layout/MainLayout';
import { Login } from '@/pages/auth/Login';
import { Register } from '@/pages/auth/Register';
import { OAuthCallback } from '@/pages/auth/OAuthCallback';
import { Dashboard } from '@/pages/Dashboard';
import { PostList } from '@/pages/posts/PostList';
import { PostEditor } from '@/pages/posts/PostEditor';
import { MediaLibrary } from '@/pages/media/MediaLibrary';
import { CommentList } from '@/pages/comments/CommentList';
import { TaxonomyList } from '@/pages/taxonomies/TaxonomyList';
import { MenuEditor } from '@/pages/menus/MenuEditor';
import { UserList } from '@/pages/users/UserList';
import { SiteList } from '@/pages/sites/SiteList';
import { SiteSettings } from '@/pages/sites/SiteSettings';
import { GeneralSettings } from '@/pages/settings/GeneralSettings';
import { GlobalSettings } from '@/pages/settings/GlobalSettings';
import { PluginList } from '@/pages/plugins/PluginList';
import { PluginSettings } from '@/pages/plugins/PluginSettings';
import { PluginUpload } from '@/pages/plugins/PluginUpload';
import PluginLogs from '@/pages/plugins/PluginLogs';
import { SliderSettings } from '@/pages/plugins/SliderSettings';
import { WPImport } from '@/pages/tools/WPImport';
import { BackupPage } from '@/pages/settings/BackupPage';
import { Analytics } from '@/pages/analytics/Analytics';
import { ApiKeys } from '@/pages/settings/ApiKeys';
import { TwoFactorAuth } from '@/pages/settings/TwoFactorAuth';
import { AMPSettings } from '@/pages/settings/AMPSettings';
import { Profile } from '@/pages/profile/Profile';
import { ShortcodeManager } from '@/pages/shortcodes/ShortcodeManager';
import { MessageList } from '@/pages/messages/MessageList';
import { RedirectSettings } from '@/pages/settings/RedirectSettings';
import { ShortUrlManager } from '@/pages/settings/ShortUrlManager';
import { ContetyPage } from '@/pages/contety/ContetyPage';
import { CmsHubBot } from '@/pages/cmshub/CmsHubBot';
import { StyleEditor } from '@/pages/design/StyleEditor';
import { LayoutBuilder } from '@/pages/design/LayoutBuilder';
import { LandingSettings } from '@/pages/settings/LandingSettings';
import { ForgotPassword } from '@/pages/auth/ForgotPassword';
import { ResetPassword } from '@/pages/auth/ResetPassword';
import { DomainSetup } from '@/pages/onboarding/DomainSetup';
import { PackageManager } from '@/pages/packages/PackageManager';
import { AddonManager } from '@/pages/addons/AddonManager';
import { UpgradePage } from '@/pages/packages/UpgradePage';
import { PaymentsPage } from '@/pages/packages/PaymentsPage';
import { ContentTypeList } from '@/pages/content-types/ContentTypeList';
import { ContentTypeEditor } from '@/pages/content-types/ContentTypeEditor';

// Dynamic wrappers for custom content type routes
function DynamicPostList() {
  const { type } = useParams();
  return <PostList postType={type as any} />;
}
function DynamicPostEditor() {
  const { type } = useParams();
  return <PostEditor postType={type as any} />;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  const { fetchSites, sites, loading } = useSiteStore();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    } else {
      fetchSites().then(() => setChecked(true));
    }
  }, [isAuthenticated]);

  // After sites are loaded, redirect non-super_admin users with no sites to domain setup
  useEffect(() => {
    if (checked && !loading && isAuthenticated && user?.role !== 'super_admin' && sites.length === 0) {
      navigate('/setup-domain', { replace: true });
    }
  }, [checked, loading, sites.length, user?.role]);

  if (!isAuthenticated) return null;
  return <>{children}</>;
}

export function App() {
  useEffect(() => {
    useThemeStore.getState().initialize();
  }, []);

  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/oauth-callback" element={<OAuthCallback />} />
        <Route path="/setup-domain" element={<DomainSetup />} />
        <Route
          path="/"
          element={
            <AuthGuard>
              <MainLayout />
            </AuthGuard>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="posts" element={<PostList postType="post" />} />
          <Route path="posts/new" element={<PostEditor postType="post" />} />
          <Route path="posts/:id" element={<PostEditor postType="post" />} />
          <Route path="pages" element={<PostList postType="page" />} />
          <Route path="pages/new" element={<PostEditor postType="page" />} />
          <Route path="pages/:id" element={<PostEditor postType="page" />} />
          <Route path="media" element={<MediaLibrary />} />
          <Route path="comments" element={<CommentList />} />
          <Route path="messages" element={<MessageList />} />
          <Route path="categories" element={<TaxonomyList type="category" />} />
          <Route path="tags" element={<TaxonomyList type="tag" />} />
          <Route path="menus" element={<MenuEditor />} />
          <Route path="users" element={<UserList />} />
          <Route path="sites" element={<SiteList />} />
          <Route path="sites/:id/settings" element={<SiteSettings />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<GeneralSettings />} />
          <Route path="global-settings" element={<GlobalSettings />} />
          <Route path="settings/api-keys" element={<ApiKeys />} />
          <Route path="settings/2fa" element={<TwoFactorAuth />} />
          <Route path="settings/amp" element={<AMPSettings />} />
          <Route path="design" element={<StyleEditor />} />
          <Route path="design/layout" element={<LayoutBuilder />} />
          <Route path="plugins" element={<PluginList />} />
          <Route path="plugins/new" element={<PluginUpload />} />
          <Route path="plugins/:slug/logs" element={<PluginLogs />} />
          <Route path="plugins/:id/settings" element={<PluginSettings />} />
          <Route path="plugins/hero-slider" element={<SliderSettings />} />
          <Route path="tools/import" element={<WPImport />} />
          <Route path="tools/backup" element={<BackupPage />} />
          <Route path="shortcodes" element={<ShortcodeManager />} />
          <Route path="settings/redirects" element={<RedirectSettings />} />
          <Route path="short-urls" element={<ShortUrlManager />} />
          <Route path="contety" element={<ContetyPage />} />
          <Route path="cmshub-bot" element={<CmsHubBot />} />
          <Route path="settings/landing" element={<LandingSettings />} />
          <Route path="packages" element={<PackageManager />} />
          <Route path="addons" element={<AddonManager />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="upgrade" element={<UpgradePage />} />
          <Route path="content-types" element={<ContentTypeList />} />
          <Route path="content-types/new" element={<ContentTypeEditor />} />
          <Route path="content-types/:slug/edit" element={<ContentTypeEditor />} />
          <Route path="content/:type" element={<DynamicPostList />} />
          <Route path="content/:type/new" element={<DynamicPostEditor />} />
          <Route path="content/:type/:id" element={<DynamicPostEditor />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
