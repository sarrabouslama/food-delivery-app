import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import {
  LayoutDashboard, UtensilsCrossed, Package, MapPin,
  Store, ClipboardList, LogOut, Bell, CheckCheck, X,
  CreditCard, RefreshCw, type LucideIcon,
} from 'lucide-react';

interface NavItem {
  to: string;
  Icon: LucideIcon;
  label: string;
  badge?: number;
}

const CUSTOMER_NAV: NavItem[] = [
  { to: '/dashboard',   Icon: LayoutDashboard,  label: 'Dashboard' },
  { to: '/restaurants', Icon: UtensilsCrossed,  label: 'Restaurants' },
  { to: '/orders',      Icon: Package,          label: 'My Orders' },
  { to: '/track',       Icon: MapPin,           label: 'Live Tracking' },
];

const RESTAURANT_NAV: NavItem[] = [
  { to: '/dashboard',   Icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/manage',      Icon: Store,           label: 'My Restaurant' },
  { to: '/manage/orders', Icon: ClipboardList, label: 'Orders' },
  { to: '/track',       Icon: MapPin,          label: 'Live Tracking' },
];

const NOTIF_ICON: Record<string, LucideIcon> = {
  ORDER_UPDATE: RefreshCw,
  PAYMENT: CreditCard,
  SYSTEM: Bell,
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const Sidebar: React.FC = () => {
  const { pathname }           = useLocation();
  const { user, logout }       = useAuth();
  const navigate               = useNavigate();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [showNotifs, setShowNotifs] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const isRestaurant = user?.role === 'restaurant';
  const navItems     = isRestaurant ? RESTAURANT_NAV : CUSTOMER_NAV;

  const handleLogout = () => { logout(); navigate('/login'); };

  // Close panel on outside click
  useEffect(() => {
    if (!showNotifs) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifs]);

  const toggleNotifs = () => {
    setShowNotifs(v => !v);
    if (!showNotifs && unreadCount > 0) markAllRead();
  };

  return (
    <aside className="sidebar" aria-label="Main navigation">
      {/* Logo + bell */}
      <div style={{ padding: '4px 8px 20px', borderBottom: '1px solid rgba(220,38,38,0.10)', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 300, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          MataamGo<span style={{ color: 'var(--soft-purple)' }}>.</span>
        </span>
        {/* Notification bell */}
        <div ref={panelRef} style={{ position: 'relative' }}>
          <button
            onClick={toggleNotifs}
            style={{
              position: 'relative', background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px', borderRadius: 'var(--radius-sm)',
              color: showNotifs ? 'var(--soft-blue)' : 'var(--text-muted)',
              transition: 'all 0.18s',
            }}
            title="Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                minWidth: 15, height: 15, borderRadius: 100,
                background: 'linear-gradient(135deg, #e03131, #991b1b)',
                color: '#fff', fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {showNotifs && (
            <div style={{
              position: 'fixed', top: 0, left: 240, bottom: 0,
              width: 320, zIndex: 200,
              background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)',
              borderRight: '1px solid var(--glass-border)',
              boxShadow: '4px 0 24px rgba(155,27,27,0.12)',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ padding: '20px 18px 14px', borderBottom: '1px solid rgba(220,38,38,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Notifications</h3>
                <button onClick={() => setShowNotifs(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                    <Bell size={32} style={{ margin: '0 auto 12px', opacity: 0.25 }} />
                    <p style={{ fontSize: 14 }}>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(n => {
                    const NIcon = NOTIF_ICON[n.type] ?? Bell;
                    const iconColor = n.type === 'PAYMENT' ? '#10b981' : n.type === 'SYSTEM' ? '#f59e0b' : 'var(--soft-blue)';
                    const iconBg = n.type === 'PAYMENT' ? 'rgba(16,185,129,0.10)' : n.type === 'SYSTEM' ? 'rgba(245,158,11,0.10)' : 'rgba(220,38,38,0.08)';
                    return (
                      <div key={n.id} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '12px 18px', borderBottom: '1px solid rgba(220,38,38,0.06)',
                        transition: 'background 0.15s',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.03)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                          background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: iconColor,
                        }}>
                          <NIcon size={13} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{n.title}</p>
                          <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 4 }}>{n.message}</p>
                          <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{timeAgo(n.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {notifications.length > 0 && (
                <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(220,38,38,0.10)' }}>
                  <button
                    onClick={() => { markAllRead(); setShowNotifs(false); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <CheckCheck size={13} /> Mark all read
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Role badge */}
      <div style={{ marginBottom: 12 }}>
        <span style={{
          display: 'inline-block', padding: '3px 10px', borderRadius: 100,
          fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
          background: isRestaurant ? 'rgba(153,27,27,0.10)' : 'rgba(220,38,38,0.09)',
          color: isRestaurant ? 'var(--soft-purple)' : 'var(--soft-blue)',
        }}>
          {isRestaurant ? 'Restaurant' : 'Customer'}
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1 }}>
        {navItems.map(({ to, Icon, label }) => {
          const active     = pathname === to || (to !== '/dashboard' && pathname.startsWith(to));
          const badgeCount = (to === '/orders' || to === '/manage/orders') ? unreadCount : 0;

          return (
            <Link
              key={to}
              to={to}
              onClick={() => { if (badgeCount > 0) markAllRead(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', fontSize: 14,
                fontWeight: active ? 500 : 400,
                color: active ? 'var(--soft-purple)' : 'var(--text-secondary)',
                background: active ? 'rgba(220,38,38,0.07)' : 'transparent',
                transition: 'all 0.18s', marginBottom: 2,
              }}
            >
              <Icon size={16} />
              <span style={{ flex: 1 }}>{label}</span>
              {active && (
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--soft-purple)' }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User profile */}
      <div style={{ borderTop: '1px solid rgba(220,38,38,0.10)', paddingTop: 14, marginTop: 8 }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', marginBottom: 8 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--soft-blue), var(--soft-purple))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 13, fontWeight: 600,
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.email}</p>
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
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </aside>
  );
};
