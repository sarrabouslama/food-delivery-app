import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { getMyOrders, type Order } from '../services/graphql';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../lib/socket';
import { Clock, PackageCheck, ChefHat, Truck, CheckCircle, XCircle, Package, MapPin, RotateCcw, Calendar, Search, type LucideIcon } from 'lucide-react';

const WS_STATUS: Record<string, string> = {
  PENDING: 'pending', CONFIRMED: 'confirmed', PREPARING: 'preparing',
  READY: 'ready', OUT_FOR_DELIVERY: 'on_the_way', DELIVERED: 'delivered', CANCELLED: 'cancelled',
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; Icon: LucideIcon }> = {
  pending:     { label: 'Pending',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  Icon: Clock },
  confirmed:   { label: 'Confirmed',  color: '#e03131', bg: 'rgba(220,38,38,0.1)',   Icon: PackageCheck },
  preparing:   { label: 'Preparing',  color: '#991b1b', bg: 'rgba(153,27,27,0.1)',   Icon: ChefHat },
  ready:       { label: 'Ready',      color: '#10b981', bg: 'rgba(16,185,129,0.1)',  Icon: PackageCheck },
  on_the_way:  { label: 'On the way', color: '#e03131', bg: 'rgba(220,38,38,0.1)',   Icon: Truck },
  delivered:   { label: 'Delivered',  color: '#10b981', bg: 'rgba(16,185,129,0.1)',  Icon: CheckCircle },
  cancelled:   { label: 'Cancelled',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   Icon: XCircle },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const OrderCard: React.FC<{ order: Order }> = ({ order }) => {
  const meta = STATUS_META[order.status] || STATUS_META.pending;
  const { Icon } = meta;
  const isActive = !['delivered', 'cancelled'].includes(order.status);

  return (
    <div className="glass-card" style={{ padding: '18px 20px', transition: 'transform 0.18s', cursor: 'default' }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, background: 'rgba(220,38,38,0.08)' }}>
          {order.restaurant.imageUrl && (
            <img src={order.restaurant.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 15 }}>{order.restaurant.name}</h3>
            <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 500, color: meta.color, background: meta.bg, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon size={10} /> {meta.label}
            </span>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {order.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={11} /> {fmtDate(order.createdAt)}
              </span>
              <span style={{ fontWeight: 500, color: 'var(--soft-purple)' }}>{order.total.toFixed(2)} TND</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {isActive && (
                <Link to={`/track/${order.id}`} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={12} /> Track
                </Link>
              )}
              {order.status === 'delivered' && (
                <Link to={`/restaurants/${order.restaurant.id}`} className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <RotateCcw size={12} /> Reorder
                </Link>
              )}
              <Link to={`/track/${order.id}`} className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }}>
                Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

type FilterStatus = 'all' | 'active' | 'delivered' | 'cancelled';

export const OrderHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    getMyOrders().then(d => setOrders(d.myOrders)).finally(() => setLoading(false));
  }, []);

  // Live status updates via shared WebSocket
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleUpdate = (d: { orderId: string; toStatus: string }) => {
      const mapped = WS_STATUS[d.toStatus] ?? d.toStatus.toLowerCase();
      setOrders(prev => prev.map(o => o.id === d.orderId ? { ...o, status: mapped } : o));
    };
    socket.on('order:status_updated', handleUpdate);
    return () => { socket.off('order:status_updated', handleUpdate); };
  }, []);

  const isRestaurant = user?.role === 'restaurant';
  const activeCount = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;

  const filtered = orders.filter(order => {
    if (filter === 'active' && ['delivered', 'cancelled'].includes(order.status)) return false;
    if (filter === 'delivered' && order.status !== 'delivered') return false;
    if (filter === 'cancelled' && order.status !== 'cancelled') return false;
    if (search && !order.restaurant.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content">
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: '1.9rem', marginBottom: 6 }}>{isRestaurant ? 'Incoming Orders' : 'My Orders'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {loading ? 'Loading…' : `${orders.length} total orders · ${activeCount} active`}
          </p>
        </div>

        {/* Filters */}
        <div className="glass-card" style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search restaurants…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'active', 'delivered', 'cancelled'] as FilterStatus[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="btn"
                style={{
                  padding: '7px 14px', fontSize: 13, textTransform: 'capitalize',
                  background: filter === f ? 'linear-gradient(135deg, var(--soft-blue), var(--soft-purple))' : 'rgba(255,255,255,0.5)',
                  color: filter === f ? '#fff' : 'var(--text-secondary)',
                  border: filter === f ? 'none' : '1px solid rgba(220,38,38,0.18)',
                }}
              >
                {f === 'all' ? `All (${orders.length})` : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Order list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: 14 }}>Loading orders…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.25 }} />
            <p style={{ fontSize: 16 }}>
              {orders.length === 0
                ? (isRestaurant ? 'No orders received yet' : 'No orders yet')
                : 'No orders match your search'}
            </p>
            {orders.length === 0 && !isRestaurant && (
              <Link to="/restaurants" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
                Browse Restaurants
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(order => <OrderCard key={order.id} order={order} />)}
          </div>
        )}
      </main>
    </div>
  );
};
