import { useQuery } from '@apollo/client/react';
import { GET_ORDERS } from '../graphql/queries';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import OrderStatusBadge from '../components/OrderStatusBadge';
import { UiIcon } from '../components/UiIcons';
import { useState } from 'react';
import './OrdersPage.css';

export function OrdersPage() {
  const { user } = useAuth();
  const { data, loading, error } = useQuery<any>(GET_ORDERS);
  const [statusFilter, setStatusFilter] = useState('');

  if (loading) return <div className="loading-state">Loading orders...</div>;
  if (error) return <div className="error-state text-danger">Failed to load orders</div>;

  const orders = data?.orders || [];
  const isRestaurant = user?.role === 'RESTAURANT';
  const activeOrders = orders.filter((order: any) => order.status !== 'DELIVERED');
  
  const filteredOrders = statusFilter 
    ? activeOrders.filter((order: any) => order.status === statusFilter)
    : activeOrders;

  const statuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'CANCELLED'];

  return (
    <div className="orders-page page-container">
      <header className="page-header">
        <div>
          <h1>{isRestaurant ? 'Order Management' : 'My Orders'}</h1>
          <p className="text-muted">{isRestaurant ? 'Track incoming orders that are still active.' : 'Track your active orders before they reach history.'}</p>
        </div>
        <Link to="/orders/history" className="btn btn-secondary">
          View delivered history
        </Link>
      </header>

      <div className="filters-bar glass-panel mb-6">
        <select 
          className="input-field" 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {statuses.map(status => (
            <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {isRestaurant ? (
        <div className="orders-list">
          {filteredOrders.length === 0 ? (
            <div className="empty-state glass-panel">No active orders found.</div>
          ) : (
            filteredOrders.map((order: any) => (
              <Link to={`/orders/${order.id}`} key={order.id} className="order-row glass-panel">
                <div className="order-row__icon">
                  <UiIcon name={isRestaurant ? 'chef' : 'receipt'} className="order-row__svg" />
                </div>
                <div className="order-row__main">
                  <div className="order-card-header order-row__header">
                    <div>
                      <h3 className="order-id">Order #{order.id.slice(-6)}</h3>
                      <p className="text-muted text-sm">
                        {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <div className="order-row__details">
                    <div className="order-entity-info">
                      <span className="entity-label">Customer:</span>
                      <span className="entity-name font-medium">
                        {order.customer.profile?.firstName} {order.customer.profile?.lastName}
                      </span>
                    </div>
                    <div className="order-items-preview text-sm text-muted">
                      {order.items.length} items • {order.items[0]?.menuItem.name} {order.items.length > 1 ? `+ ${order.items.length - 1} more` : ''}
                    </div>
                  </div>
                </div>

                <div className="order-row__side">
                  <span className="order-total font-medium">${order.totalPrice.toFixed(2)}</span>
                  <span className="view-details text-primary text-sm">Open order →</span>
                </div>
              </Link>
            ))
          )}
        </div>
      ) : (
        <div className="orders-grid orders-grid--customer">
          {filteredOrders.length === 0 ? (
            <div className="empty-state glass-panel">No active orders found.</div>
          ) : (
            filteredOrders.map((order: any) => (
              <Link to={`/orders/${order.id}`} key={order.id} className="order-card glass-panel order-card--customer">
                <div className="order-card__icon">
                  <UiIcon name="receipt" className="order-card__svg" />
                </div>
                <div className="order-card-header">
                  <div>
                    <h3 className="order-id">Order #{order.id.slice(-6)}</h3>
                    <p className="text-muted text-sm">
                      {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                <div className="order-card-body">
                  <div className="order-entity-info">
                    <span className="entity-label">From:</span>
                    <span className="entity-name font-medium">{order.restaurant.name}</span>
                  </div>
                  <div className="order-items-preview text-sm text-muted">
                    {order.items.length} items • {order.items[0]?.menuItem.name} {order.items.length > 1 ? `+ ${order.items.length - 1} more` : ''}
                  </div>
                </div>

                <div className="order-card-footer">
                  <span className="order-total font-medium">${order.totalPrice.toFixed(2)}</span>
                  <span className="view-details text-primary text-sm">View Details →</span>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
