// src/pages/OrderTrackingPage.tsx
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useWebSocket, type OrderStatus } from '../hooks/useWebSocket';
import { useSSE } from '../hooks/useSSE';
import { useToast } from '../context/ToastContext';
import { MOCK_ORDERS } from '../services/graphql';

const STEPS: { status: OrderStatus; label: string; icon: string }[] = [
  { status: 'pending',    label: 'Order Placed',   icon: '📋' },
  { status: 'confirmed',  label: 'Confirmed',       icon: '✅' },
  { status: 'preparing',  label: 'Preparing',       icon: '👨‍🍳' },
  { status: 'ready',      label: 'Ready',           icon: '🛍' },
  { status: 'on_the_way', label: 'On the Way',      icon: '🛵' },
  { status: 'delivered',  label: 'Delivered',       icon: '🎉' },
];

const STATUS_INDEX: Record<OrderStatus, number> = {
  pending: 0, confirmed: 1, preparing: 2, ready: 3, on_the_way: 4, delivered: 5, cancelled: -1,
};

const ACTOR_COLORS: Record<string, string> = {
  customer: 'rgba(107,143,255,0.15)',
  restaurant: 'rgba(168,85,247,0.15)',
  driver: 'rgba(16,185,129,0.15)',
  system: 'rgba(245,158,11,0.1)',
};
const ACTOR_TEXT: Record<string, string> = {
  customer: 'var(--soft-blue)',
  restaurant: 'var(--soft-purple)',
  driver: '#10b981',
  system: '#f59e0b',
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export const OrderTrackingPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { addToast } = useToast();

  const order = MOCK_ORDERS.find(o => o.id === orderId) || MOCK_ORDERS[1];

  const { connected: wsConnected, currentStatus, updates } = useWebSocket({
    orderId: order.id,
    useMock: true,
    onUpdate: (update) => {
      addToast(
        update.status === 'delivered' ? 'success' : 'info',
        update.message,
        update.estimatedMinutes ? `~${update.estimatedMinutes} min remaining` : undefined,
      );
    },
  });

  const { events: auditEvents, connected: sseConnected } = useSSE({
    orderId: order.id,
    useMock: true,
  });

  const stepIndex = STATUS_INDEX[currentStatus] ?? 0;

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
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
              Order #{order.id} · {order.restaurant.name}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 100, background: wsConnected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', fontSize: 12, fontWeight: 500, color: wsConnected ? '#10b981' : '#ef4444' }}>
              <span className="status-dot" style={{ background: wsConnected ? '#10b981' : '#ef4444', width: 7, height: 7, borderRadius: '50%', display: 'inline-block' }} />
              WebSocket {wsConnected ? 'Live' : 'Offline'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 100, background: sseConnected ? 'rgba(107,143,255,0.1)' : 'rgba(245,158,11,0.1)', fontSize: 12, fontWeight: 500, color: sseConnected ? 'var(--soft-blue)' : '#f59e0b' }}>
              <span style={{ background: sseConnected ? 'var(--soft-blue)' : '#f59e0b', width: 7, height: 7, borderRadius: '50%', display: 'inline-block' }} />
              SSE {sseConnected ? 'Streaming' : 'Idle'}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
          {/* Left: tracking card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Progress stepper */}
            <div className="glass-card" style={{ padding: '28px 32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                {/* Progress line */}
                <div style={{ position: 'absolute', top: 20, left: '5%', right: '5%', height: 3, background: 'rgba(107,143,255,0.15)', borderRadius: 2 }} />
                <div style={{
                  position: 'absolute', top: 20, left: '5%',
                  width: `${Math.min(100, (stepIndex / (STEPS.length - 1)) * 90)}%`,
                  height: 3, background: 'linear-gradient(90deg, var(--soft-blue), var(--soft-purple))',
                  borderRadius: 2, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                }} />

                {STEPS.map((step, idx) => {
                  const done = idx < stepIndex;
                  const active = idx === stepIndex;
                  return (
                    <div key={step.status} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, zIndex: 1, flex: 1 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: done ? 'linear-gradient(135deg, var(--soft-blue), var(--soft-purple))' : active ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.6)',
                        border: active ? '2px solid var(--soft-purple)' : done ? 'none' : '1px solid rgba(107,143,255,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: active ? 18 : 16,
                        transition: 'all 0.4s',
                        boxShadow: active ? '0 0 0 6px rgba(168,85,247,0.1)' : done ? '0 4px 12px rgba(107,143,255,0.3)' : 'none',
                        animation: active ? 'pulse-step 2s infinite' : 'none',
                      }}>
                        {done ? '✓' : step.icon}
                      </div>
                      <p style={{ fontSize: 11, textAlign: 'center', color: active ? 'var(--soft-purple)' : done ? 'var(--text-secondary)' : 'var(--text-muted)', fontWeight: active ? 500 : 400 }}>
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              <style>{`@keyframes pulse-step { 0%,100%{box-shadow:0 0 0 6px rgba(168,85,247,0.1)} 50%{box-shadow:0 0 0 10px rgba(168,85,247,0.05)} }`}</style>

              {/* Current message */}
              {updates.length > 0 && (
                <div style={{ marginTop: 28, padding: '14px 18px', background: 'rgba(168,85,247,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(168,85,247,0.15)' }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {updates[updates.length - 1].message}
                  </p>
                  {updates[updates.length - 1].estimatedMinutes && (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      ⏱ Est. {updates[updates.length - 1].estimatedMinutes} minutes remaining
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Order summary */}
            <div className="glass-card" style={{ padding: '20px 24px' }}>
              <h3 style={{ marginBottom: 14 }}>Order Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {order.items.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.quantity}× {item.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid rgba(107,143,255,0.1)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 500 }}>
                <span>Total</span>
                <span style={{ color: 'var(--soft-purple)' }}>${order.total.toFixed(2)}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
                📍 {order.deliveryAddress}
              </p>
            </div>
          </div>

          {/* Right: Audit timeline (SSE) */}
          <div className="glass-card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3>Audit Timeline</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: sseConnected ? 'var(--soft-blue)' : 'var(--text-muted)' }}>
                {sseConnected && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--soft-blue)', display: 'inline-block', animation: 'pulse-green 1.5s infinite' }} />}
                {sseConnected ? 'Live stream' : 'Finished'}
              </div>
            </div>

            {auditEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                <div className="spinner" style={{ margin: '0 auto 12px' }} />
                Waiting for events…
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {auditEvents.map((event, idx) => (
                  <div key={event.id} style={{ display: 'flex', gap: 12, paddingBottom: idx < auditEvents.length - 1 ? 16 : 0 }}>
                    {/* Timeline line */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: ACTOR_COLORS[event.actorRole] || 'rgba(107,143,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, color: ACTOR_TEXT[event.actorRole] || 'var(--soft-blue)',
                        fontWeight: 600, flexShrink: 0,
                      }}>
                        {event.actor.charAt(0).toUpperCase()}
                      </div>
                      {idx < auditEvents.length - 1 && (
                        <div style={{ width: 1, flex: 1, minHeight: 12, background: 'rgba(107,143,255,0.12)', marginTop: 4 }} />
                      )}
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1, paddingTop: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: ACTOR_TEXT[event.actorRole] || 'var(--soft-blue)' }}>
                          {event.action.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2, lineHeight: 1.5 }}>
                        {event.details}
                      </p>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.7 }}>
                        {event.actor} · {fmtTime(event.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
