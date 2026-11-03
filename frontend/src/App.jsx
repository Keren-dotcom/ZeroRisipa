import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Register from './pages/Register';
import Pantry from './pages/Pantry';
import Recipes from './pages/Recipes';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route 
          path="/pantry" 
          element={
            <ProtectedRoute>
              <Pantry />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/recipes" 
          element={
            <ProtectedRoute>
              <Recipes />
            </ProtectedRoute>
          } 
        />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/pantry" replace />} />
      </Routes>
    </BrowserRouter>
  );
}