import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppShell } from '@/components/layout/AppShell'
import { TabProvider } from '@/contexts/TabContext'
import { AppProvider } from '@/contexts/AppContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { Home } from '@/pages/Home'
import { Learn } from '@/pages/Learn'
import { History } from '@/pages/History'
import { Bookmarks } from '@/pages/Bookmarks'
import { Notes } from '@/pages/Notes'
import { Settings } from '@/pages/Settings'
import { About } from '@/pages/About'
import { DocumentTutor } from '@/pages/DocumentTutor'
import { CompilerLab } from '@/pages/CompilerLab'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'

export default function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <TabProvider>
            <Routes>
              {/* Public auth routes - no layout */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* App layout with navbar/sidebar */}
              <Route element={<AppShell />}>
                {/* Protected routes - require auth */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<AppProvider><Home /></AppProvider>} />
                  <Route path="/learn" element={<Learn />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/bookmarks" element={<Bookmarks />} />
                  <Route path="/notes" element={<Notes />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/document-tutor" element={<DocumentTutor />} />
                  <Route path="/compiler-lab" element={<CompilerLab />} />
                </Route>

                {/* Public pages inside app shell */}
                <Route path="/about" element={<About />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </TabProvider>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  )
}
