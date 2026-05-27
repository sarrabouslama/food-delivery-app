// src/pages/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { getMyOrders, getRestaurants, type Order, type Restaurant } from '../services/graphql';

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Pending',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  confirmed:   { label: 'Confirmed',   color: '#6b8fff', bg: 'rgba(107,143,255,0.1)' },
  preparing:   { label: 'Preparing',   color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
  ready:       { label: 'Ready',       color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  on_the_way:  { label: 'On the way',  color: '#6b8fff', bg: 'rgba(107,143,255,0.1)' },
  delivered:   { label: 'Delivered',   color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  cancelled:   { label: 'Cancelled',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

const StatCard: React.FC<{ label: string; value: string | number; icon: string; accent: string }> = ({ label, value, icon, accent }) => (
  <div className="glass-card" style={{ padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: -16, right: -10, fontSize: 64, opacity: 0.06, lineHeight: 1 }}>{icon}</div>
    <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{label}</p>
    <p style={{ fontSize: 28, fontWeight: 300, fontFamily: 'var(--font-display)', color: accent }}>{value}</p>
  </div>
);

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [time, setTime] = useState(new Date());
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    getMyOrders().then(d => setOrders(d.myOrders)).finally(() => setLoadingOrders(false));
    getRestaurants().then(d => setRestaurants(d.restaurants)).finally(() => setLoadingRestaurants(false));
  }, []);

  const greeting = () => {
    const h = time.getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const isRestaurant = user?.role === 'restaurant';
  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const totalRevenue = deliveredOrders.reduce((s, o) => s + o.total, 0);

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
            {time.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 style={{ fontSize: '2rem' }}>
            {greeting()}, {user?.name?.split(' ')[0] || 'there'} 👋
          </h1>
          {isRestaurant && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Restaurant dashboard — managing incoming orders</p>
          )}
        </div>

        {/* Stat cards */}
        <div className="grid-4" style={{ marginBottom: 32 }}>
          <StatCard label={isRestaurant ? 'Orders Received' : 'Total Orders'} value={loadingOrders ? '…' : orders.length} icon="📦" accent="var(--soft-blue)" />
          <StatCard label="Active Orders" value={loadingOrders ? '…' : activeOrders.length} icon="🔄" accent="var(--soft-purple)" />
          <StatCard label={isRestaurant ? 'Total Revenue' : 'Total Spent'} value={loadingOrders ? '…' : `${totalRevenue.toFixed(2)} TND`} icon="💳" accent="var(--soft-pink)" />
          <StatCard label="Restaurants" value={loadingRestaurants ? '…' : restaurants.length} icon="🍽" accent="#10b981" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
          {/* Recent orders */}
          <div>
            <div className="section-header">
              <h3>{isRestaurant ? 'Incoming Orders' : 'Recent Orders'}</h3>
              <Link to="/orders" style={{ fontSize: 13, color: 'var(--soft-blue)', textDecoration: 'none', fontWeight: 500 }}>
                View all →
              </Link>
            </div>

            {loadingOrders ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <div className="spinner" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: 13 }}>Loading orders…</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="glass-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}>📭</p>
                <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No orders yet</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  {isRestaurant ? 'Customers haven\'t placed any orders yet.' : 'Browse restaurants and place your first order!'}
                </p>
                {!isRestaurant && (
                  <Link to="/restaurants" className="btn btn-primary" style={{ display: 'inline-flex', justifyContent: 'center' }}>
                    Browse Restaurants
                  </Link>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {orders.slice(0, 5).map(order => {
                  const meta = STATUS_META[order.status] || STATUS_META.pending;
                  return (
                    <Link key={order.id} to={`/track/${order.id}`} style={{ textDecoration: 'none' }}>
                      <div className="glass-card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'transform 0.18s' }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
                        <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, background: 'rgba(107,143,255,0.1)' }}>
                          {order.restaurant.imageUrl && (
                            <img src={order.restaurant.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{order.restaurant.name}</p>
                          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{order.items.map(i => i.name).join(', ')}</p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 500, color: meta.color, background: meta.bg, marginBottom: 4 }}>
                            {meta.label}
                          </span>
                          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{order.total.toFixed(2)} TND</p>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(order.createdAt)}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right column */}
          <div>
            {!isRestaurant && (
              <>
                <div className="section-header">
                  <h3>Quick Order</h3>
                  <Link to="/restaurants" style={{ fontSize: 13, color: 'var(--soft-blue)', textDecoration: 'none', fontWeight: 500 }}>See all →</Link>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {loadingRestaurants ? (
                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
                  ) : restaurants.filter(r => r.isOpen).slice(0, 4).map(r => (
                    <Link key={r.id} to={`/restaurants/${r.id}`} style={{ textDecoration: 'none' }}>
                      <div className="glass-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'transform 0.18s' }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
                        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0 }}>
                          {r.imageUrl && <img src={r.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{r.name}</p>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.deliveryTime} min · {r.deliveryFee.toFixed(2)} TND delivery</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                          <span style={{ color: '#f59e0b' }}>★</span>
                          {r.rating}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {/* Active order card */}
            {activeOrders.length > 0 && (
              <div style={{ marginTop: isRestaurant ? 0 : 20 }}>
                <h3 style={{ marginBottom: 12 }}>Active Order</h3>
                <div className="glass-card" style={{ padding: '18px', background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{activeOrders[0].restaurant.name}</p>
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 100, background: 'rgba(168,85,247,0.15)', color: 'var(--soft-purple)', fontWeight: 500 }}>
                      {STATUS_META[activeOrders[0].status]?.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                    {activeOrders[0].items.map(i => `${i.quantity}× ${i.name}`).join(', ')}
                  </p>
                  <Link to={`/track/${activeOrders[0].id}`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
                    📍 Track Order
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
