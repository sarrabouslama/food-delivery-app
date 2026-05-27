import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Notifications } from './Notifications';
import { UiIcon } from './UiIcons';
import './Layout.css';

export function Layout() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = user?.role === 'CUSTOMER' 
    ? [
        { path: '/', label: 'Dashboard', icon: 'dashboard' as const },
        { path: '/restaurants', label: 'Restaurants', icon: 'restaurant' as const },
        { path: '/cart', label: `Cart${itemCount > 0 ? ` (${itemCount})` : ''}`, icon: 'cart' as const },
        { path: '/orders', label: 'My Orders', icon: 'orders' as const },
        { path: '/orders/history', label: 'History', icon: 'history' as const },
      ]
    : [
        { path: '/', label: 'Dashboard', icon: 'dashboard' as const },
        { path: '/restaurant/manage', label: 'Manage Restaurant', icon: 'restaurant' as const },
        { path: '/orders', label: 'Manage Orders', icon: 'orders' as const },
        { path: '/orders/history', label: 'History', icon: 'history' as const },
      ];

  return (
    <div className="layout-container">
      <aside className="sidebar glass-panel">
        <div className="sidebar-brand">
          <span className="brand-icon brand-icon--delivery">
            <UiIcon name="delivery" className="brand-icon__svg" />
          </span>
          <h2>CraveDrop</h2>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link 
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path || (item.path === '/orders' && location.pathname.startsWith('/orders/')) ? 'active' : ''}`}
            >
              <span className="nav-icon">
                <UiIcon name={item.icon} className="nav-icon__svg" />
              </span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">{user?.email?.charAt(0).toUpperCase()}</div>
            <div className="user-info">
              <span className="user-name">{user?.email}</span>
              <span className="user-role">{user?.role}</span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <UiIcon name="logout" className="btn-logout__icon" />
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-search">
            {/* Search could go here */}
          </div>
          <div className="topbar-actions">
            <Notifications />
          </div>
        </header>

        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
