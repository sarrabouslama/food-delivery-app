import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { api } from '../lib/api';
import './CartPage.css';

type PaymentMethod = 'CASH' | 'STRIPE';

export function CartPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { restaurant, items, itemCount, subtotal, setQuantity, removeItem, clearCart } = useCart();
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCheckout = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!restaurant || items.length === 0) return;

    setIsSubmitting(true);
    try {
      const payload = {
        restaurantId: restaurant.id,
        address,
        notes: notes || undefined,
        paymentMethod,
        items: items.map(line => ({
          menuItemId: line.menuItem.id,
          quantity: line.quantity,
        })),
      };

      const order = await api.post<{ id: string }>('/orders', payload);

      if (paymentMethod === 'STRIPE') {
        const baseUrl = window.location.origin;
        const checkout = await api.post<{ url?: string }> (`/orders/${order.id}/stripe-checkout`, {
          successUrl: `${baseUrl}/orders/${order.id}?payment=stripe-success`,
          cancelUrl: `${baseUrl}/cart?payment=stripe-cancel`,
        });

        if (!checkout.url) {
          throw new Error('Stripe checkout session could not be created');
        }

        toast.success('Redirecting to Stripe...');
        clearCart();
        window.location.href = checkout.url;
        return;
      }

      toast.success('Cash order placed successfully');
      clearCart();
      navigate('/orders');
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="cart-page page-container">
        <header className="page-header">
          <h1>Your Cart</h1>
        </header>
        <div className="empty-cart glass-panel">
          <div className="empty-cart__icon">🧺</div>
          <h2>Your cart is empty</h2>
          <p className="text-muted">Browse restaurants and add items to start an order.</p>
          <Link to="/restaurants" className="btn btn-primary mt-4">Browse restaurants</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page page-container">
      <header className="page-header cart-header">
        <div>
          <h1>Your Cart</h1>
          <p className="text-muted">
            {restaurant ? `Ordering from ${restaurant.name}` : 'One restaurant per order'}
          </p>
        </div>
        <div className="cart-header__meta glass-panel">
          <span>{itemCount} items</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
      </header>

      <div className="cart-layout">
        <section className="cart-lines glass-panel">
          <h2>Items</h2>
          <div className="cart-lines__list">
            {items.map(line => (
              <article key={line.menuItem.id} className="cart-line">
                <div className="cart-line__info">
                  <h3>{line.menuItem.name}</h3>
                  <p className="text-muted text-sm">${line.menuItem.price.toFixed(2)} each</p>
                </div>
                <div className="cart-line__controls">
                  <button type="button" className="btn-icon" onClick={() => setQuantity(line.menuItem.id, line.quantity - 1)}>-</button>
                  <span>{line.quantity}</span>
                  <button type="button" className="btn-icon" onClick={() => setQuantity(line.menuItem.id, line.quantity + 1)}>+</button>
                </div>
                <div className="cart-line__price">${(line.menuItem.price * line.quantity).toFixed(2)}</div>
                <button type="button" className="cart-line__remove" onClick={() => removeItem(line.menuItem.id)}>
                  Remove
                </button>
              </article>
            ))}
          </div>

          <div className="cart-actions">
            <Link to={`/restaurants/${restaurant?.id ?? ''}`} className="btn btn-secondary">
              Back to restaurant
            </Link>
            <button type="button" className="btn btn-secondary" onClick={clearCart}>
              Clear cart
            </button>
          </div>
        </section>

        <aside className="cart-checkout glass-panel">
          <h2>Checkout</h2>
          <p className="text-muted text-sm mb-4">Signed in as {user?.email}</p>

          <form onSubmit={handleCheckout}>
            <div className="form-group">
              <label htmlFor="address">Delivery address</label>
              <textarea
                id="address"
                className="input-field"
                placeholder="Street, city, apartment, code"
                value={address}
                onChange={e => setAddress(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                className="input-field"
                placeholder="Gate code, allergies, delivery instructions"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="payment-method">Payment method</label>
              <select
                id="payment-method"
                className="input-field"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                <option value="CASH">Cash on delivery</option>
                <option value="STRIPE">Stripe</option>
              </select>
              <p className="text-muted text-sm mt-2">
                {paymentMethod === 'STRIPE'
                  ? 'You will be redirected to Stripe to complete payment securely.'
                  : 'Payment will be collected when the order is delivered.'}
              </p>
            </div>

            <div className="cart-checkout__summary">
              <h3>Receipt summary</h3>
              <div className="summary-row">
                <span>Payment method</span>
                <strong>{paymentMethod === 'STRIPE' ? 'Stripe' : 'Cash on delivery'}</strong>
              </div>
            </div>

            <div className="cart-checkout__totals">
              <div className="summary-row">
                <span>Subtotal</span>
                <strong>${subtotal.toFixed(2)}</strong>
              </div>
              <div className="summary-row text-muted text-sm">
                <span>Restaurant</span>
                <span>{restaurant?.name}</span>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-100 mt-4" disabled={isSubmitting}>
              {isSubmitting ? 'Placing order...' : 'Place order'}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}