// src/components/Sidebar.tsx
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/dashboard', icon: '⬡', label: 'Dashboard' },
  { to: '/restaurants', icon: '🍽', label: 'Restaurants' },
  { to: '/orders', icon: '📦', label: 'My Orders' },
  { to: '/track', icon: '📍', label: 'Live Tracking' },
];

const Logo = () => (
  <div style={{ padding: '4px 8px 20px', borderBottom: '1px solid rgba(107,143,255,0.12)', marginBottom: 8 }}>
    <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 300, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
      MataamGo<span style={{ color: 'var(--soft-purple)' }}>.</span>
    </span>
  </div>
);

export const Sidebar: React.FC = () => {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <Logo />

      <nav style={{ flex: 1 }}>
        {NAV.map(({ to, icon, label }) => {
          const active = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', fontSize: 14, fontWeight: active ? 500 : 400,
                color: active ? 'var(--soft-purple)' : 'var(--text-secondary)',
                background: active ? 'rgba(168,85,247,0.08)' : 'transparent',
                transition: 'all 0.18s',
                marginBottom: 2,
              }}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{icon}</span>
              {label}
              {active && (
                <span style={{
                  marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%',
                  background: 'var(--soft-purple)',
                }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User profile at bottom */}
      <div style={{
        borderTop: '1px solid rgba(107,143,255,0.12)',
        paddingTop: 14, marginTop: 8,
      }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', marginBottom: 8 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--soft-blue), var(--soft-purple))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 13, fontWeight: 500, flexShrink: 0,
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 12px', borderRadius: 'var(--radius-md)',
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--text-muted)', transition: 'all 0.18s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.07)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span>↩</span> Sign out
        </button>
      </div>
    </aside>
  );
};
