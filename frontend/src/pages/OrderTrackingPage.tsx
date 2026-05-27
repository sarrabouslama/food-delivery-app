import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useWebSocket, type OrderStatus } from '../hooks/useWebSocket';
import { useSSE, getEventMeta, type AuditEvent } from '../hooks/useSSE';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { getOrder, createCheckoutSession, getOrderAuditLogs, updateOrderStatus, type Order } from '../services/graphql';
import {
  ClipboardList, CheckCircle2, ChefHat, ShoppingBag, Truck, CheckCircle,
  XCircle, MapPin, Clock, Radio, User, Store, CreditCard, PackageCheck, type LucideIcon,
} from 'lucide-react';

const STEPS: { status: OrderStatus; label: string; Icon: LucideIcon }[] = [
  { status: 'pending',    label: 'Placed',     Icon: ClipboardList },
  { status: 'confirmed',  label: 'Confirmed',  Icon: CheckCircle2 },
  { status: 'preparing',  label: 'Preparing',  Icon: ChefHat },
  { status: 'ready',      label: 'Ready',      Icon: ShoppingBag },
  { status: 'on_the_way', label: 'On the Way', Icon: Truck },
  { status: 'delivered',  label: 'Delivered',  Icon: CheckCircle },
];

const STATUS_INDEX: Record<OrderStatus, number> = {
  pending: 0, confirmed: 1, preparing: 2, ready: 3, on_the_way: 4, delivered: 5, cancelled: -1,
};

const ROLE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  customer:   { bg: 'rgba(220,38,38,0.10)',  color: '#e03131',   label: 'Customer' },
  restaurant: { bg: 'rgba(153,27,27,0.12)',  color: '#991b1b',   label: 'Restaurant' },
  driver:     { bg: 'rgba(16,185,129,0.12)', color: '#10b981',   label: 'Driver' },
  system:     { bg: 'rgba(245,158,11,0.10)', color: '#f59e0b',   label: 'System' },
};

const ROLE_ICON: Record<string, LucideIcon> = {
  customer:   User,
  restaurant: Store,
  driver:     Truck,
  system:     ClipboardList,
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export const OrderTrackingPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [payingOut, setPayingOut] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [auditHistory, setAuditHistory] = useState<AuditEvent[]>([]);
  const paymentToastShown = useRef(false);

  useEffect(() => {
    if (!orderId) { setLoading(false); return; }
    getOrder(orderId)
      .then(d => setOrder(d.order))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
    // Load full audit trail from DB
    getOrderAuditLogs(orderId).then(logs => {
      setAuditHistory(logs.map(l => ({
        id: l.id,
        orderId: l.orderId,
        eventType: l.eventType,
        fromStatus: l.fromStatus,
        toStatus: l.toStatus,
        triggeredBy: l.triggeredBy,
        timestamp: l.createdAt,
      })));
    });
  }, [orderId]);

  // Show one-time toast for Stripe redirect outcome
  useEffect(() => {
    if (paymentToastShown.current) return;
    const payParam = searchParams.get('payment');
    if (payParam === 'success') {
      paymentToastShown.current = true;
      addToast('success', 'Payment successful!', 'Your order is being processed.');
    } else if (payParam === 'cancelled') {
      paymentToastShown.current = true;
      addToast('info', 'Payment cancelled', 'You can retry payment at any time.');
    }
  }, [searchParams, addToast]);

  const handlePayNow = async () => {
    if (!orderId) return;
    setPayingOut(true);
    try {
      const { url } = await createCheckoutSession(orderId);
      window.location.href = url;
    } catch (e) {
      addToast('error', 'Payment failed', (e as Error).message);
      setPayingOut(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!orderId) return;
    setConfirming(true);
    try {
      await updateOrderStatus(orderId, 'DELIVERED');
      addToast('success', 'Delivery confirmed!', 'Thank you for your order.');
      setOrder(prev => prev ? { ...prev, status: 'delivered' } : prev);
    } catch (e) {
      addToast('error', 'Could not confirm delivery', (e as Error).message);
    } finally {
      setConfirming(false);
    }
  };

  const isCustomer = user?.role === 'customer';

  const initialStatus = (order?.status as OrderStatus | undefined) ?? 'pending';

  const { connected: wsConnected, currentStatus, updates } = useWebSocket({
    orderId,
    initialStatus,
    onUpdate: (u) => {
      addToast(
        u.status === 'delivered' ? 'success' : 'info',
        u.message,
        u.estimatedMinutes ? `~${u.estimatedMinutes} min remaining` : undefined,
      );
    },
  });

  const { events: liveAuditEvents, connected: sseConnected } = useSSE({ orderId });

  // Merge historical audit logs with live SSE events, dedup by id, sort oldest→newest
  const auditEvents = useMemo<AuditEvent[]>(() => {
    const seen = new Set<string>();
    return [...auditHistory, ...liveAuditEvents]
      .filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [auditHistory, liveAuditEvents]);

  const stepIndex = STATUS_INDEX[currentStatus] ?? STATUS_INDEX[initialStatus] ?? 0;
  const lastUpdate = updates[updates.length - 1];

  if (loading) {
    return (
      <div className="page-layout">
        <Sidebar />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: 14 }}>Loading order…</p>
          </div>
        </main>
      </div>
    );
  }

  if (!order && !orderId) {
    return (
      <div className="page-layout">
        <Sidebar />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <ShoppingBag size={48} style={{ margin: '0 auto 16px', opacity: 0.25 }} />
            <p style={{ fontSize: 16, marginBottom: 8 }}>No order selected</p>
            <Link to="/orders" style={{ color: 'var(--soft-blue)', fontSize: 14 }}>← Go to My Orders</Link>
          </div>
        </main>
      </div>
    );
  }

  const displayOrder = order;
  const isCancelled = currentStatus === 'cancelled';

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Link to="/orders" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
              ← Back to orders
            </Link>
            <h1 style={{ fontSize: '1.8rem' }}>Live Tracking</h1>
            {displayOrder && (
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
                Order #{displayOrder.id.slice(0, 8)}… · {displayOrder.restaurant.name}
              </p>
            )}
          </div>

          {/* Connection status pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <ConnectionPill label="WebSocket" connected={wsConnected} color="#10b981" offColor="#ef4444" />
            <ConnectionPill label="Events" connected={sseConnected} color="var(--soft-blue)" offColor="#f59e0b" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Progress stepper */}
            <div className="glass-card" style={{ padding: '32px 28px' }}>
              {isCancelled ? (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <XCircle size={48} style={{ margin: '0 auto 12px', color: '#ef4444', opacity: 0.8 }} />
                  <p style={{ fontSize: 18, fontWeight: 500, color: '#ef4444' }}>Order Cancelled</p>
                </div>
              ) : (
                <>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    {/* Background track */}
                    <div style={{
                      position: 'absolute', top: 19, left: '4%', right: '4%',
                      height: 3, background: 'rgba(220,38,38,0.10)', borderRadius: 2,
                    }} />
                    {/* Progress fill */}
                    <div style={{
                      position: 'absolute', top: 19, left: '4%',
                      width: `${(stepIndex / (STEPS.length - 1)) * 92}%`,
                      height: 3,
                      background: 'linear-gradient(90deg, #e03131, #991b1b)',
                      borderRadius: 2,
                      transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)',
                    }} />

                    {STEPS.map((step, idx) => {
                      const done   = idx < stepIndex;
                      const active = idx === stepIndex;
                      const StepIcon = step.Icon;
                      return (
                        <div key={step.status} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, zIndex: 1, flex: 1 }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: '50%',
                            background: done
                              ? 'linear-gradient(135deg, #e03131, #991b1b)'
                              : active
                                ? 'rgba(220,38,38,0.08)'
                                : 'rgba(255,255,255,0.7)',
                            border: active
                              ? '2px solid #e03131'
                              : done
                                ? 'none'
                                : '1.5px solid rgba(220,38,38,0.18)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                            boxShadow: active
                              ? '0 0 0 7px rgba(220,38,38,0.08), 0 4px 14px rgba(220,38,38,0.18)'
                              : done
                                ? '0 4px 12px rgba(220,38,38,0.25)'
                                : 'none',
                            animation: active ? 'pulse-step 2s ease-in-out infinite' : 'none',
                          }}>
                            {done ? (
                              <CheckCircle size={16} style={{ color: '#fff' }} />
                            ) : (
                              <StepIcon size={active ? 17 : 15} style={{ color: active ? '#e03131' : 'var(--text-muted)' }} />
                            )}
                          </div>
                          <p style={{
                            fontSize: 11, textAlign: 'center', lineHeight: 1.3,
                            color: active ? '#e03131' : done ? 'var(--text-secondary)' : 'var(--text-muted)',
                            fontWeight: active ? 600 : 400,
                          }}>
                            {step.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <style>{`
                    @keyframes pulse-step {
                      0%,100% { box-shadow: 0 0 0 7px rgba(220,38,38,0.08), 0 4px 14px rgba(220,38,38,0.18); }
                      50%     { box-shadow: 0 0 0 12px rgba(220,38,38,0.04), 0 4px 14px rgba(220,38,38,0.18); }
                    }
                  `}</style>

                  {/* Status message */}
                  <div style={{
                    marginTop: 28, padding: '14px 18px',
                    background: 'linear-gradient(135deg, rgba(220,38,38,0.05), rgba(153,27,27,0.04))',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(220,38,38,0.12)',
                  }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: lastUpdate?.estimatedMinutes ? 6 : 0 }}>
                      {lastUpdate?.message ?? `Order is ${(currentStatus as string).replace(/_/g, ' ')}`}
                    </p>
                    {lastUpdate?.estimatedMinutes && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} /> ~{lastUpdate.estimatedMinutes} min remaining
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Pay Now card — customers only, when order needs payment */}
            {isCustomer && (currentStatus === 'pending' || currentStatus === 'confirmed') && !isCancelled && (
              <div className="glass-card" style={{
                padding: '22px 24px',
                border: '1.5px solid rgba(220,38,38,0.22)',
                background: 'linear-gradient(135deg, rgba(255,245,245,0.9), rgba(255,240,240,0.7))',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #e03131, #991b1b)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <CreditCard size={16} style={{ color: '#fff' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Payment Required</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {currentStatus === 'pending' ? 'Complete payment to confirm your order' : 'Confirm payment to start preparation'}
                    </p>
                  </div>
                </div>
                {displayOrder && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
                    Total due: <strong style={{ color: 'var(--soft-purple)', fontSize: 15 }}>{displayOrder.total.toFixed(2)} TND</strong>
                  </p>
                )}
                <button
                  onClick={handlePayNow}
                  disabled={payingOut}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', fontSize: 14, opacity: payingOut ? 0.75 : 1 }}
                >
                  <CreditCard size={15} />
                  {payingOut ? 'Redirecting to payment…' : 'Pay Now'}
                </button>
              </div>
            )}

            {/* Confirm Delivery — shown to customer when order is on the way */}
            {isCustomer && currentStatus === 'on_the_way' && !isCancelled && (
              <div className="glass-card" style={{
                padding: '22px 24px',
                border: '1.5px solid rgba(16,185,129,0.25)',
                background: 'linear-gradient(135deg, rgba(240,253,244,0.9), rgba(220,252,231,0.7))',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <PackageCheck size={16} style={{ color: '#fff' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#065f46' }}>Order Arrived?</p>
                    <p style={{ fontSize: 12, color: '#6ee7b7' }}>Confirm you received your order</p>
                  </div>
                </div>
                <button
                  onClick={handleConfirmDelivery}
                  disabled={confirming}
                  style={{
                    width: '100%', justifyContent: 'center', fontSize: 14,
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '11px', borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#fff', border: 'none', cursor: 'pointer',
                    opacity: confirming ? 0.7 : 1,
                    boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
                  }}
                >
                  <PackageCheck size={15} />
                  {confirming ? 'Confirming…' : 'Confirm Delivery'}
                </button>
              </div>
            )}

            {/* Order summary */}
            {displayOrder && (
              <div className="glass-card" style={{ padding: '22px 24px' }}>
                <h3 style={{ marginBottom: 16, fontSize: 15 }}>Order Summary</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                  {displayOrder.items.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--soft-purple)', fontWeight: 500 }}>{item.quantity}×</span> {item.name}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{(item.price * item.quantity).toFixed(2)} TND</span>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: '1px solid rgba(220,38,38,0.1)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 600 }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--soft-purple)' }}>{displayOrder.total.toFixed(2)} TND</span>
                </div>
                {displayOrder.deliveryAddress && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={11} /> {displayOrder.deliveryAddress}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right: Audit timeline */}
          <div className="glass-card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ fontSize: 15 }}>Event Timeline</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: sseConnected ? 'var(--soft-blue)' : 'var(--text-muted)' }}>
                {sseConnected && (
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--soft-blue)', display: 'inline-block',
                    animation: 'live-pulse 1.4s ease-in-out infinite',
                  }} />
                )}
                <style>{`@keyframes live-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
                {sseConnected ? 'Live' : 'Idle'}
              </div>
            </div>

            {auditEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                <Radio size={32} style={{ margin: '0 auto 10px', opacity: 0.35 }} />
                <p>Waiting for events…</p>
                <p style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>Events appear here in real-time</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {auditEvents.map((ev, idx) => {
                  const meta = getEventMeta(ev.eventType);
                  const style = ROLE_STYLE[meta.role] ?? ROLE_STYLE.system;
                  const RoleIcon = ROLE_ICON[meta.role] ?? ClipboardList;
                  return (
                    <div key={ev.id} style={{ display: 'flex', gap: 12, paddingBottom: idx < auditEvents.length - 1 ? 16 : 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: style.bg,
                          border: `1.5px solid ${style.color}30`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: style.color,
                        }}>
                          <RoleIcon size={13} />
                        </div>
                        {idx < auditEvents.length - 1 && (
                          <div style={{ width: 1, flex: 1, minHeight: 12, background: 'rgba(220,38,38,0.1)', marginTop: 4 }} />
                        )}
                      </div>
                      <div style={{ flex: 1, paddingTop: 4 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: style.color, marginBottom: 2 }}>
                          {meta.label}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.75 }}>
                          {meta.role.charAt(0).toUpperCase() + meta.role.slice(1)} · {fmtTime(ev.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const ConnectionPill: React.FC<{ label: string; connected: boolean; color: string; offColor: string }> = ({
  label, connected, color, offColor,
}) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '5px 12px', borderRadius: 100,
    background: connected ? `${color}18` : `${offColor}18`,
    fontSize: 12, fontWeight: 500,
    color: connected ? color : offColor,
    border: `1px solid ${connected ? color : offColor}30`,
  }}>
    <span style={{
      width: 6, height: 6, borderRadius: '50%',
      background: connected ? color : offColor,
      display: 'inline-block',
      animation: connected ? 'live-pulse 1.4s ease-in-out infinite' : 'none',
    }} />
    {label} {connected ? 'Live' : 'Offline'}
  </div>
);
