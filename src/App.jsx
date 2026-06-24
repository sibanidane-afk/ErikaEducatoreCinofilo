import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import UserDashboard from './pages/UserDashboard';
import ManagerDashboard from './pages/ManagerDashboard';

function PrivateRoute({ children, requiredRole }) {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">⏳ Caricamento...</div>;
  if (!user) return <Navigate to="/login" />;
  const userRole = role || 'user';
  if (userRole !== requiredRole) {
    if (userRole === 'user') return <Navigate to="/user" />;
    if (userRole === 'manager') return <Navigate to="/manager" />;
    return <Navigate to="/login" />;
  }
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/user" element={<PrivateRoute requiredRole="user"><UserDashboard /></PrivateRoute>} />
          <Route path="/manager" element={<PrivateRoute requiredRole="manager"><ManagerDashboard /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;