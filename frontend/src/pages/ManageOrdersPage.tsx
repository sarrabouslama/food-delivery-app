import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import { getMyOrders, updateOrderStatus, type Order, type BackendOrderStatus } from '../services/graphql';
import { Clock, ChefHat, PackageCheck, Truck, CheckCircle, XCircle, MapPin, RefreshCw, type LucideIcon } from 'lucide-react';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  Icon: LucideIcon;
  nextStatus?: BackendOrderStatus;
  nextLabel?: string;
}> = {
  pending: {
    label: 'Pending',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',
    Icon: Clock,          nextStatus: 'CONFIRMED', nextLabel: 'Confirm Order',
  },
  confirmed: {
    label: 'Confirmed',   color: '#e03131', bg: 'rgba(220,38,38,0.10)',
    Icon: PackageCheck,   nextStatus: 'PREPARING', nextLabel: 'Start Preparing',
  },
  preparing: {
    label: 'Preparing',   color: '#991b1b', bg: 'rgba(153,27,27,0.10)',
    Icon: ChefHat,        nextStatus: 'READY', nextLabel: 'Mark Ready',
  },
  ready: {
    label: 'Ready',       color: '#10b981', bg: 'rgba(16,185,129,0.1)',
    Icon: PackageCheck,   nextStatus: 'OUT_FOR_DELIVERY', nextLabel: 'Out for Delivery',
  },
  on_the_way: {
    label: 'On the Way',  color: '#e03131', bg: 'rgba(220,38,38,0.10)',
    Icon: Truck,          nextStatus: 'DELIVERED', nextLabel: 'Mark Delivered',
  },
  delivered: {
    label: 'Delivered',   color: '#10b981', bg: 'rgba(16,185,129,0.1)',
    Icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelled',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)',
    Icon: XCircle,
  },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// ─── Order card ───────────────────────────────────────────────────────────────

const OrderCard: React.FC<{
  order: Order;
  onStatusUpdate: (orderId: string, newStatus: BackendOrderStatus) => Promise<void>;
}> = ({ order, onStatusUpdate }) => {
  const [loading, setLoading] = useState(false);
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const { Icon } = cfg;

  const handleAdvance = async () => {
    if (!cfg.nextStatus) return;
    setLoading(true);
    try { await onStatusUpdate(order.id, cfg.nextStatus); }
    finally { setLoading(false); }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this order?')) return;
    setLoading(true);
    try { await onStatusUpdate(order.id, 'CANCELLED'); }
    finally { setLoading(false); }
  };

  const isFinal = ['delivered', 'cancelled'].includes(order.status);

  return (
    <div className="glass-card" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        {/* Status indicator */}
        <div style={{
          width: 44, height: 44, borderRadius: 'var(--radius-sm)', flexShrink: 0,
          background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} style={{ color: cfg.color }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                Order #{order.id.slice(0, 8)}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(order.createdAt)}</p>
            </div>
            <span style={{
              padding: '3px 10px', borderRadius: 100,
              fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, flexShrink: 0,
            }}>
              {cfg.label}
            </span>
          </div>

          {/* Items */}
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.6 }}>
            {order.items.map(i => (
              <span key={i.id}>
                <span style={{ fontWeight: 500 }}>{i.quantity}×</span> {i.name}
                {' '}
              </span>
            ))}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--soft-purple)' }}>{order.total.toFixed(2)} TND</span>
              {order.deliveryAddress && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <MapPin size={10} /> {order.deliveryAddress}
                </span>
              )}
            </div>

            {!isFinal && (
              <div style={{ display: 'flex', gap: 8 }}>
                {cfg.nextStatus && (
                  <button
                    onClick={handleAdvance}
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ padding: '7px 14px', fontSize: 12, opacity: loading ? 0.7 : 1 }}
                  >
                    {cfg.nextLabel}
                  </button>
                )}
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="btn"
                  style={{ padding: '7px 12px', fontSize: 12, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                >
                  Cancel
                </button>
                <Link to={`/track/${order.id}`} className="btn" style={{ padding: '7px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={12} /> Track
                </Link>
              </div>
            )}
            {isFinal && (
              <Link to={`/track/${order.id}`} className="btn" style={{ padding: '7px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={12} /> View
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = 'new' | 'active' | 'done';

export const ManageOrdersPage: React.FC = () => {
  const { addToast }        = useToast();
  const { notifications }   = useNotifications();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab]             = useState<Tab>('new');

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const { myOrders } = await getMyOrders();
      setOrders(myOrders);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Refresh when a notification arrives (customer placed or status changed)
  useEffect(() => {
    if (notifications.length) loadOrders(true);
  }, [notifications, loadOrders]);

  const handleStatusUpdate = async (orderId: string, newStatus: BackendOrderStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus.toLowerCase().replace('out_for_delivery', 'on_the_way') } : o));
      addToast('success', 'Order updated', `Status → ${newStatus.replace(/_/g, ' ')}`);
    } catch (e) {
      addToast('error', 'Failed to update order', (e as Error).message);
    }
  };

  const newOrders    = orders.filter(o => o.status === 'pending');
  const activeOrders = orders.filter(o => ['confirmed', 'preparing', 'ready', 'on_the_way'].includes(o.status));
  const doneOrders   = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  const tabData: Record<Tab, { label: string; orders: Order[]; count: number }> = {
    new:    { label: 'New',      orders: newOrders,    count: newOrders.length },
    active: { label: 'Active',   orders: activeOrders, count: activeOrders.length },
    done:   { label: 'Completed', orders: doneOrders,  count: doneOrders.length },
  };

  const displayed = tabData[tab].orders;

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Restaurant</p>
            <h1 style={{ fontSize: '1.9rem' }}>Manage Orders</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              {orders.length} total · {newOrders.length} new
            </p>
          </div>
          <button
            onClick={() => loadOrders(true)}
            disabled={refreshing}
            className="btn"
            style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(220,38,38,0.10)', paddingBottom: 0 }}>
          {(Object.entries(tabData) as [Tab, typeof tabData[Tab]][]).map(([key, t]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: '10px 18px', fontSize: 13, fontWeight: tab === key ? 600 : 400,
                background: 'none', border: 'none', cursor: 'pointer',
                color: tab === key ? 'var(--soft-purple)' : 'var(--text-muted)',
                borderBottom: tab === key ? '2px solid var(--soft-purple)' : '2px solid transparent',
                marginBottom: -1, transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {t.label}
              {t.count > 0 && (
                <span style={{
                  minWidth: 18, height: 18, borderRadius: 100,
                  background: key === 'new' ? 'var(--soft-purple)' : 'rgba(220,38,38,0.18)',
                  color: key === 'new' ? '#fff' : 'var(--soft-blue)',
                  fontSize: 10, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13 }}>Loading orders…</p>
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <PackageCheck size={36} style={{ margin: '0 auto 14px', opacity: 0.3 }} />
            <p style={{ fontSize: 15, fontWeight: 500 }}>
              {tab === 'new' ? 'No new orders' : tab === 'active' ? 'No active orders' : 'No completed orders'}
            </p>
            {tab === 'new' && <p style={{ fontSize: 13, marginTop: 6 }}>New orders from customers will appear here.</p>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {displayed.map(order => (
              <OrderCard key={order.id} order={order} onStatusUpdate={handleStatusUpdate} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
