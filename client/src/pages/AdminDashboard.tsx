import React from 'react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Placeholder logout handler - clear auth and redirect
  const handleLogout = () => {
    // TODO: Clear tokens/auth context
    navigate('/admin/login');
  };

  return (
    <div style={{ maxWidth: 800, margin: 'auto', padding: 20 }}>
      <h1>Admin Dashboard</h1>
      <p>Welcome to the admin dashboard. Backend integration coming soon.</p>

      <button onClick={handleLogout} style={{ padding: '10px 20px' }}>
        Logout
      </button>
    </div>
  );
};

export default AdminDashboard;
