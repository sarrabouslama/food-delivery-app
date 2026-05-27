import { useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { GET_ORDER } from '../graphql/queries';
import { useAuth } from '../contexts/AuthContext';
import { useOrderTracking } from '../hooks/useOrderTracking';
import { useSSE } from '../hooks/useSSE';
import OrderStatusBadge from '../components/OrderStatusBadge';
import OrderTimeline from '../components/OrderTimeline';
import { api } from '../lib/api';
import { toast } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import './OrderDetailPage.css';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { user } = useAuth();
  
  const { data, loading, error, refetch } = useQuery<any>(GET_ORDER, {
    variables: { id },
  });

  // Real-time hooks
  const { liveStatus } = useOrderTracking(id!);
  const { events: liveAuditLogs } = useSSE(id!);

  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>('');

  const order = data?.order;
  const isRestaurant = user?.role === 'RESTAURANT';

  // Sync live status with local state to drive UI
  useEffect(() => {
    if (liveStatus) {
      setCurrentStatus(liveStatus);
    } else if (order?.status) {
      setCurrentStatus(order.status);
    }
  }, [liveStatus, order?.status]);

  if (loading) return <div className="loading-state">Loading order details...</div>;
  if (error || !order) return <div className="error-state text-danger">Failed to load order.</div>;

  const handleUpdateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await api.patch(`/orders/${id}/status`, { status: newStatus });
      toast.success(`Order marked as ${newStatus.replace(/_/g, ' ')}`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const nextStatusOptions: Record<string, string[]> = {
    'PENDING': ['CONFIRMED', 'CANCELLED'],
    'CONFIRMED': ['PREPARING'],
    'PREPARING': ['READY'],
    'READY': ['OUT_FOR_DELIVERY'],
    'OUT_FOR_DELIVERY': ['DELIVERED'],
  };

  const availableActions = isRestaurant ? (nextStatusOptions[currentStatus] || []) : [];
  const canManageOrder = isRestaurant && currentStatus !== 'DELIVERED';
  const isStripeCheckoutSuccess = new URLSearchParams(location.search).get('payment') === 'stripe-success';
  const paymentMethodLabel = order.payment?.stripePaymentId || isStripeCheckoutSuccess ? 'Stripe' : 'Cash on delivery';

  const receiptEvents = [...(order.auditLogs || [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const liveHistoryLogs = [...receiptEvents, ...(liveAuditLogs || [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <div className="order-detail-page page-container">
      <header className="page-header order-header receipt-header">
        <div>
          <p className="receipt-kicker text-muted">Receipt</p>
          <h1>Order #{order.id.slice(-6)}</h1>
          <p className="text-muted">
            Placed on {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="status-container">
          <OrderStatusBadge status={currentStatus} />
          {liveStatus && <span className="live-indicator ml-2">Live</span>}
        </div>
      </header>

      <div className="order-detail-main">
        <div className="order-content-grid">
          <div className="main-column">
            <div className="receipt-card glass-panel mb-6 p-6">
              <div className="receipt-summary-row">
                <div>
                  <h2 className="section-title">Receipt summary</h2>
                </div>
                <div className="receipt-total">
                  <span>Total</span>
                  <strong>${order.totalPrice.toFixed(2)}</strong>
                </div>
              </div>
              <div className="receipt-meta-grid">
                <div>
                  <span className="receipt-label">Restaurant</span>
                  <strong>{order.restaurant.name}</strong>
                </div>
                <div>
                  <span className="receipt-label">Customer</span>
                  <strong>{order.customer.profile?.firstName} {order.customer.profile?.lastName}</strong>
                </div>
                <div>
                  <span className="receipt-label">Payment method</span>
                  <strong>{paymentMethodLabel}</strong>
                </div>
                <div>
                  <span className="receipt-label">Payment status</span>
                  <strong>{order.payment?.status ?? 'PENDING'}</strong>
                </div>
                <div>
                  <span className="receipt-label">Delivery</span>
                  <strong>{order.address}</strong>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 receipt-items-card">
              <h2 className="section-title">Items</h2>
              <div className="order-items-list">
                {order.items.map((item: any) => (
                  <div key={item.id} className="order-item-row">
                    <div className="item-quantity">{item.quantity}x</div>
                    <div className="item-name">{item.menuItem.name}</div>
                    <div className="item-price">${item.subtotal.toFixed(2)}</div>
                  </div>
                ))}
              </div>

              <div className="order-summary-box">
                {order.notes && (
                  <div className="order-notes text-muted text-sm mb-4">
                    <strong>Notes:</strong> {order.notes}
                  </div>
                )}
                <div className="summary-row font-medium text-lg mt-4 pt-4 border-t">
                  <span>Total</span>
                  <span className="text-primary">${order.totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="side-column">
            <div className="glass-panel p-6 mb-6">
              <h2 className="section-title">Delivery Details</h2>
              <div className="detail-row">
                <strong>Restaurant:</strong> {order.restaurant.name}
              </div>
              <div className="detail-row">
                <strong>Customer:</strong> {order.customer.profile?.firstName} {order.customer.profile?.lastName}
              </div>
              <div className="detail-row">
                <strong>Address:</strong> {order.address}
              </div>
              {order.payment && (
                <div className="detail-row">
                  <strong>Payment:</strong> <span className={`text-${order.payment.status === 'PAID' ? 'success' : 'warning'}`}>{order.payment.status}</span>
                </div>
              )}
            </div>
            {canManageOrder && (
              <div className="glass-panel p-6 mb-6">
                <h2 className="section-title">Manage Order</h2>
                <div className="action-buttons">
                  {availableActions.map(action => (
                    <button
                      key={action}
                      className={`btn w-100 mb-2 ${action === 'CANCELLED' ? 'btn-secondary text-danger' : 'btn-primary'}`}
                      onClick={() => handleUpdateStatus(action)}
                      disabled={isUpdating}
                    >
                      Mark as {action.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel live-history-panel">
        <h2 className="section-title">Live history</h2>
        {liveHistoryLogs.length === 0 ? (
          <p className="text-muted text-sm">No live events yet.</p>
        ) : (
          <OrderTimeline logs={receiptEvents} liveEvents={liveAuditLogs || []} />
        )}
      </div>
    </div>
  );
}
