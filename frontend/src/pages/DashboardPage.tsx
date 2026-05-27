import { useQuery } from '@apollo/client/react';
import { useAuth } from '../contexts/AuthContext';
import { GET_ORDERS } from '../graphql/queries';
import OrderStatusBadge from '../components/OrderStatusBadge';
import { Link } from 'react-router-dom';
import { UiIcon } from '../components/UiIcons';
import './DashboardPage.css';

export function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, error } = useQuery<any>(GET_ORDERS);

  if (loading) return <div className="loading-state">Loading dashboard...</div>;
  if (error) return <div className="error-state text-danger">Error loading dashboard</div>;

  const orders = data?.orders || [];
  
  const activeOrders = orders.filter((o: any) => 
    !['DELIVERED', 'CANCELLED'].includes(o.status)
  );

  const completedOrders = orders.filter((o: any) => o.status === 'DELIVERED');

  return (
    <div className="dashboard page-container">
      <header className="page-header">
        <h1>Welcome back, {user?.email.split('@')[0]} 👋</h1>
        <p className="text-muted">Here's what's happening today.</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon stat-icon--blue">
            <UiIcon name="package" className="stat-icon__svg" />
          </div>
          <div className="stat-info">
            <h3>Active Orders</h3>
            <p className="stat-value">{activeOrders.length}</p>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-icon stat-icon--green">
            <UiIcon name="check" className="stat-icon__svg" />
          </div>
          <div className="stat-info">
            <h3>Completed</h3>
            <p className="stat-value">{completedOrders.length}</p>
          </div>
        </div>
        {user?.role === 'RESTAURANT' && (
          <div className="stat-card glass-panel">
            <div className="stat-icon stat-icon--teal">
              <UiIcon name="wallet" className="stat-icon__svg" />
            </div>
            <div className="stat-info">
              <h3>Revenue</h3>
              <p className="stat-value text-success">
                ${completedOrders.reduce((sum: number, o: any) => sum + o.totalPrice, 0).toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="recent-orders mt-6">
        <div className="section-header">
          <h2>Recent Activity</h2>
          <Link to="/orders" className="text-primary text-sm">View All</Link>
        </div>
        
        <div className="orders-list glass-panel">
          {orders.slice(0, 5).length === 0 ? (
            <div className="empty-state">No orders yet.</div>
          ) : (
            orders.slice(0, 5).map((order: any) => (
              <Link to={`/orders/${order.id}`} key={order.id} className="order-list-item">
                <div className="order-list-item__icon">
                  <UiIcon name="receipt" className="order-list-item__svg" />
                </div>
                <div className="order-main-info">
                  <div className="order-id">Order #{order.id.slice(-6)}</div>
                  <div className="order-entity text-muted">
                    {user?.role === 'CUSTOMER' ? order.restaurant.name : order.customer.email}
                  </div>
                </div>
                <div className="order-amount font-medium">
                  ${order.totalPrice.toFixed(2)}
                </div>
                <div className="order-status-wrapper">
                  <OrderStatusBadge status={order.status} />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
