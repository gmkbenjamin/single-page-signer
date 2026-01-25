import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Vault } from './pages/Vault';
import { Scan } from './pages/Scan';
import { Generate } from './pages/Generate';
import { ShowQR } from './pages/ShowQR';
import { Login } from './pages/Login';
import { Setup } from './pages/Setup';
import { SignConfirm } from './pages/SignConfirm';
import { Import } from './pages/Import';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Layout should only be shown when authenticated?
// Or maybe Layout handles the top bar but the content is Login/Setup.
// Actually, for better UX, Login/Setup usually take full screen without nav.
const AppContent = () => {
  const { isLocked, isEmpty } = useAuth();

  if (isEmpty) return <Setup />;
  if (isLocked) return <Login />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Vault />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/generate" element={<Generate />} />
        <Route path="/qr/:id" element={<ShowQR />} />
        <Route path="/sign" element={<SignConfirm />} />
        <Route path="/import" element={<Import />} />
        <Route path="/settings" element={
          <div className="flex flex-col items-center justify-center h-64 text-textMuted">
            <h2 className="text-xl font-bold mb-2">Settings</h2>
            <p>Version 0.2.0 (Encrypted)</p>
            <button
              onClick={() => {
                if (confirm("This will delete all your secrets forever. Are you sure?")) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="mt-6 px-6 py-3 border border-error text-error rounded hover:bg-error/10 transition-colors"
            >
              Reset & Wipe Vault
            </button>
          </div>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
