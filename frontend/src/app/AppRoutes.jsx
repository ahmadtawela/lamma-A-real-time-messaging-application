import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { GuestOnly, RequireAuth, Splash } from '@/app/guards';
import AppLayout from '@/app/layout/AppLayout';
import WelcomePage from '@/features/auth/pages/WelcomePage';
import LoginPage from '@/features/auth/pages/LoginPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage';
import VerifyEmailPage from '@/features/auth/pages/VerifyEmailPage';
import CodePage from '@/features/auth/pages/CodePage';
import ChatsPage from '@/features/chat/pages/ChatsPage';
import NotFound from '@/app/pages/NotFound';

// Heavier / rarely used screens are split into their own chunks.
const GroupsPage = lazy(() => import('@/features/groups/pages/GroupsPage'));
const ContactsPage = lazy(() => import('@/features/contacts/pages/ContactsPage'));
const StatusPage = lazy(() => import('@/features/status/pages/StatusPage'));
const CallsPage = lazy(() => import('@/features/calls/pages/CallsPage'));
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage'));
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage'));
const NotificationsPage = lazy(() => import('@/features/notifications/pages/NotificationsPage'));
const AdminLayout = lazy(() => import('@/features/admin/layout/AdminLayout'));
const AdminDashboard = lazy(() => import('@/features/admin/pages/AdminDashboard'));
const AdminUsers = lazy(() => import('@/features/admin/pages/AdminUsers'));
const AdminGroups = lazy(() => import('@/features/admin/pages/AdminGroups'));
const AdminReports = lazy(() => import('@/features/admin/pages/AdminReports'));
const AdminSettings = lazy(() => import('@/features/admin/pages/AdminSettings'));

export default function AppRoutes() {
  return (
    <Suspense fallback={<Splash />}>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/two-factor" element={<CodePage mode="two-factor" />} />
          <Route path="/account-recovery" element={<CodePage mode="recovery" />} />
          <Route path="/verify-device" element={<CodePage mode="device" />} />
        </Route>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<ChatsPage />} />
            <Route path="chat/:conversationId" element={<ChatsPage />} />
            <Route path="groups" element={<GroupsPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="status" element={<StatusPage />} />
            <Route path="calls" element={<CallsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Route>
        </Route>
        <Route element={<RequireAuth admin />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="groups" element={<AdminGroups />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
