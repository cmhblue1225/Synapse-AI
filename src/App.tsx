import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ToastContainer } from 'react-toastify';

// Import optimized query client
import { queryClient } from './lib/queryClient';

// Import security initialization
import { initializeSecurity } from './lib/security';

// Store initialization
import { useAuthStore } from './stores/auth.store';

// Layout components
import { Layout } from './components/layout/Layout';
import { AuthLayout } from './components/layout/AuthLayout';

// Page components
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { SearchPage } from './pages/search/SearchPage';
import { KnowledgePage } from './pages/knowledge/KnowledgePage';
import { CreateNodePage } from './pages/knowledge/CreateNodePage';
import { NodeDetailPage } from './pages/knowledge/NodeDetailPage';
import { EditNodePage } from './pages/knowledge/EditNodePage';
import { GraphPage } from './pages/GraphPage';
import { AIChatPage } from './pages/AIChatPage';
import { ProfilePage } from './pages/ProfilePage';
import { StatsPage } from './pages/StatsPage';
import { TagsPage } from './pages/TagsPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Protected Route component
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Styles
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const initializeAuth = useAuthStore(state => state.initializeAuth);

  useEffect(() => {
    // Initialize security measures
    initializeSecurity();

    // Initialize authentication state from Supabase session
    initializeAuth();
  }, [initializeAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            
            {/* Auth routes */}
            <Route path="/auth" element={<AuthLayout />}>
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route index element={<Navigate to="/auth/login" replace />} />
            </Route>

            {/* Protected routes */}
            <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="dashboard" element={<DashboardPage />} />

              {/* Search routes */}
              <Route path="search" element={<SearchPage />} />

              {/* Knowledge routes */}
              <Route path="knowledge" element={<KnowledgePage />} />
              <Route path="knowledge/create" element={<CreateNodePage />} />
              <Route path="knowledge/:nodeId" element={<NodeDetailPage />} />
              <Route path="knowledge/:nodeId/edit" element={<EditNodePage />} />

              {/* Graph visualization route */}
              <Route path="graph" element={<GraphPage />} />

              {/* AI Chat route */}
              <Route path="ai-chat" element={<AIChatPage />} />

              {/* Statistics route */}
              <Route path="stats" element={<StatsPage />} />

              {/* Tags management route */}
              <Route path="tags" element={<TagsPage />} />

              {/* Settings route */}
              <Route path="settings" element={<SettingsPage />} />

              {/* Profile routes */}
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* 404 route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>

          {/* Toast notifications */}
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </div>
      </Router>

      {/* React Query DevTools */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App
