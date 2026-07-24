import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppShell } from '@/components/layout/AppShell'
import { TabProvider } from '@/contexts/TabContext'
import { AppProvider } from '@/contexts/AppContext'

import { NotificationProvider } from '@/contexts/NotificationContext'
import { Home } from '@/pages/Home'
import { Learn } from '@/pages/Learn'
import { History } from '@/pages/History'
import { Bookmarks } from '@/pages/Bookmarks'
import { Notes } from '@/pages/Notes'
import { About } from '@/pages/About'
import { DocumentTutor } from '@/pages/DocumentTutor'
import { CompilerLab } from '@/pages/CompilerLab'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { AdminRoute } from '@/components/layout/AdminRoute'
import { Dashboard } from '@/pages/ops/Dashboard'
import { NotFound } from '@/pages/NotFound'

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <TabProvider>
          <Routes>
            {/* Public auth routes - no layout */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Admin Protected Dashboard */}
            <Route element={<AdminRoute />}>
              <Route path="/ops-dashboard" element={<Dashboard />} />
            </Route>

            {/* App layout with navbar/sidebar */}
            <Route element={<AppShell />}>
              {/* Protected routes - require auth */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<AppProvider><Home /></AppProvider>} />
                <Route path="/learn" element={<Learn />} />
                <Route path="/history" element={<History />} />
                <Route path="/bookmarks" element={<Bookmarks />} />
                <Route path="/notes" element={<Notes />} />
                <Route path="/document-tutor" element={<DocumentTutor />} />
                <Route path="/compiler-lab" element={<CompilerLab />} />
              </Route>

              {/* Public pages inside app shell */}
              <Route path="/about" element={<About />} />
            </Route>

            {/* Catch-all for routing failures */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TabProvider>
      </AuthProvider>
    </NotificationProvider>
  )
}
