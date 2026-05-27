// src/pages/RestaurantDetailPage.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useToast } from '../context/ToastContext';
import { getRestaurant, createOrder, type MenuItem, type Restaurant } from '../services/graphql';
import { Clock, UtensilsCrossed, Utensils, CreditCard, Banknote, Lock } from 'lucide-react';
import { createCheckoutSession } from '../services/graphql';

interface CartItem extends MenuItem { quantity: number; }

export const RestaurantDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    getRestaurant(id).then(d => {
      setRestaurant(d.restaurant);
      setMenu(d.restaurant.menu || []);
    }).finally(() => setLoading(false));
  }, [id]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(menu.map(i => i.category)))], [menu]);
  const filteredMenu = activeCategory === 'All' ? menu : menu.filter(i => i.category === activeCategory);

  const addToCart = (item: MenuItem) => {
    if (!item.available) return;
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1 }];
    });
    addToast('success', `${item.name} added to cart`);
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === itemId);
      if (!existing) return prev;
      if (existing.quantity === 1) return prev.filter(c => c.id !== itemId);
      return prev.map(c => c.id === itemId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  };

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartQty = (itemId: string) => cart.find(c => c.id === itemId)?.quantity || 0;

  const handleCheckout = async () => {
    if (cart.length === 0 || !restaurant) return;
    if (!deliveryAddress.trim()) {
      addToast('error', 'Delivery address required', 'Please enter where to deliver your order');
      return;
    }
    setCheckoutLoading(true);
    try {
      const result = await createOrder({
        restaurantId: restaurant.id,
        items: cart.map(c => ({ menuItemId: c.id, quantity: c.quantity })),
        deliveryAddress,
      });
      const orderId = result.createOrder.id;

      if (paymentMethod === 'card') {
        addToast('success', 'Order placed!', 'Redirecting to Stripe payment…');
        const { url } = await createCheckoutSession(orderId);
        window.location.href = url;
      } else {
        addToast('success', 'Order placed!', 'Pay the driver on delivery.');
        setTimeout(() => navigate(`/track/${orderId}`), 1200);
      }
    } catch (err: unknown) {
      addToast('error', 'Failed to place order', err instanceof Error ? err.message : 'Please try again');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-layout">
        <Sidebar />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: 14 }}>Loading menu…</p>
          </div>
        </main>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="page-layout">
        <Sidebar />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <UtensilsCrossed size={40} style={{ margin: '0 auto 12px', opacity: 0.25 }} />
            <p style={{ fontSize: 16 }}>Restaurant not found</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content" style={{ paddingRight: cart.length > 0 ? '380px' : '32px', transition: 'padding-right 0.3s' }}>
        {/* Hero */}
        <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', height: 220, position: 'relative', marginBottom: 24 }}>
          <img
            src={restaurant.imageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80'}
            alt={restaurant.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(30,27,75,0.7) 0%, transparent 60%)' }} />
          <div style={{ position: 'absolute', bottom: 20, left: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ color: '#fff', fontSize: '1.8rem' }}>{restaurant.name}</h1>
              {!restaurant.isOpen && (
                <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600, background: 'rgba(239,68,68,0.85)', color: '#fff', letterSpacing: '0.04em' }}>
                  CLOSED
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {restaurant.deliveryTime} min</span>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>★ {restaurant.rating}</span>
              {restaurant.cuisine && (
                <>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
                  <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>{restaurant.cuisine}</span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 'var(--radius-sm)', padding: '7px 14px', color: '#fff', cursor: 'pointer', fontSize: 13 }}
          >
            ← Back
          </button>
        </div>

        {/* Closed restaurant banner */}
        {!restaurant.isOpen && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 18px', borderRadius: 'var(--radius-md)', marginBottom: 20,
            background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.25)',
          }}>
            <Lock size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#ef4444', marginBottom: 2 }}>This restaurant is currently closed</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>You can browse the menu but cannot place an order right now.</p>
            </div>
          </div>
        )}

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 20 }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className="btn"
              style={{
                padding: '7px 16px', fontSize: 13, flexShrink: 0,
                background: activeCategory === cat ? 'linear-gradient(135deg, var(--soft-blue), var(--soft-purple))' : 'rgba(255,255,255,0.5)',
                color: activeCategory === cat ? '#fff' : 'var(--text-secondary)',
                border: activeCategory === cat ? 'none' : '1px solid rgba(220,38,38,0.18)',
              }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Menu items */}
        {filteredMenu.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <Utensils size={36} style={{ margin: '0 auto 10px', opacity: 0.25 }} />
            <p style={{ fontSize: 15 }}>No items in this category</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredMenu.map(item => {
              const qty = cartQty(item.id);
              return (
                <div key={item.id} className="glass-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, opacity: item.available ? 1 : 0.55 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{item.name}</p>
                      {!item.available && <span className="badge badge-red" style={{ fontSize: 10 }}>Unavailable</span>}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{item.description}</p>
                    <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--soft-purple)' }}>{item.price.toFixed(2)} TND</p>
                  </div>
                  {item.available && restaurant.isOpen && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {qty > 0 && (
                        <>
                          <button onClick={() => removeFromCart(item.id)} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(220,38,38,0.25)', background: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                          <span style={{ fontSize: 14, fontWeight: 500, minWidth: 16, textAlign: 'center' }}>{qty}</span>
                        </>
                      )}
                      <button onClick={() => addToCart(item)} style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--soft-blue), var(--soft-purple))',
                        border: 'none', cursor: 'pointer', color: '#fff', fontSize: 18,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 10px rgba(220,38,38,0.30)',
                      }}>+</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Cart panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, width: 340, height: '100vh',
        background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(24px)',
        borderLeft: '1px solid var(--glass-border)', padding: 24,
        transform: cart.length > 0 ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column', zIndex: 200,
        overflowY: 'auto',
      }}>
        <h3 style={{ marginBottom: 4 }}>Your Cart</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>{cartCount} item{cartCount !== 1 ? 's' : ''} from {restaurant.name}</p>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cart.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(220,38,38,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(220,38,38,0.08)' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 500 }}>{item.name}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.price.toFixed(2)} TND each</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <button onClick={() => removeFromCart(item.id)} style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid rgba(220,38,38,0.18)', background: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                <span style={{ fontSize: 13, fontWeight: 500, minWidth: 14, textAlign: 'center' }}>{item.quantity}</span>
                <button onClick={() => addToCart(item)} style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, var(--soft-blue), var(--soft-purple))', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--soft-purple)', minWidth: 54, textAlign: 'right' }}>{(item.price * item.quantity).toFixed(2)} TND</span>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(220,38,38,0.12)' }}>
            {/* Delivery address */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Delivery address</label>
              <input
                type="text"
                placeholder="Enter your address…"
                value={deliveryAddress}
                onChange={e => setDeliveryAddress(e.target.value)}
                style={{ fontSize: 13, padding: '9px 12px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: 'var(--text-muted)' }}>
              <span>Subtotal</span><span>{cartTotal.toFixed(2)} TND</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>
              <span>Delivery fee</span><span>{restaurant.deliveryFee.toFixed(2)} TND</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18, fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>
              <span>Total</span><span>{(cartTotal + restaurant.deliveryFee).toFixed(2)} TND</span>
            </div>

            {/* Payment method */}
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {([
                { id: 'card' as const, label: 'Card', sub: 'Pay via Stripe', Icon: CreditCard },
                { id: 'cash' as const, label: 'Cash', sub: 'Pay on delivery', Icon: Banknote },
              ]).map(({ id, label, sub, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPaymentMethod(id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '10px 8px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    border: paymentMethod === id ? '2px solid #e03131' : '1.5px solid rgba(220,38,38,0.18)',
                    background: paymentMethod === id ? 'rgba(220,38,38,0.07)' : 'rgba(255,255,255,0.5)',
                    transition: 'all 0.18s',
                  }}
                >
                  <Icon size={18} style={{ color: paymentMethod === id ? '#e03131' : 'var(--text-muted)' }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: paymentMethod === id ? '#e03131' : 'var(--text-primary)' }}>{label}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{sub}</span>
                </button>
              ))}
            </div>

            {!restaurant.isOpen ? (
              <div style={{
                width: '100%', padding: '12px', borderRadius: 'var(--radius-md)',
                background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.20)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 14, color: '#ef4444', fontWeight: 500,
              }}>
                <Lock size={14} /> Restaurant is closed
              </div>
            ) : (
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, opacity: checkoutLoading ? 0.6 : 1 }}
                disabled={checkoutLoading}
                onClick={handleCheckout}
              >
                {checkoutLoading
                  ? (paymentMethod === 'card' ? 'Redirecting to payment…' : 'Placing order…')
                  : (paymentMethod === 'card' ? 'Pay by Card →' : 'Place Order (Cash) →')
                }
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
