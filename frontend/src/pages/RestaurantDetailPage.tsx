import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { GET_RESTAURANT } from '../graphql/queries';
import { toast } from 'react-hot-toast';
import { useCart } from '../contexts/CartContext';
import './RestaurantDetailPage.css';

export function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<any>(GET_RESTAURANT, {
    variables: { id },
  });

  const { restaurant: cartRestaurant, addItem, replaceCart } = useCart();

  if (loading) return <div className="loading-state">Loading restaurant...</div>;
  if (error || !data?.restaurant) return <div className="error-state text-danger">Restaurant not found.</div>;

  const restaurant = data.restaurant;
  const categories = restaurant.categories ?? [];
  const standaloneItems = restaurant.menuItems ?? [];
  const visibleCategories = categories.filter((cat: any) => (cat.menuItems?.length ?? 0) > 0);

  const categoryLinks = visibleCategories.map((cat: any) => ({ id: cat.id, name: cat.name }));
  if (standaloneItems.length > 0 && visibleCategories.length === 0) {
    categoryLinks.unshift({ id: 'all-items', name: 'All dishes' });
  }

  const handleAddToCart = (item: any) => {
    const result = addItem(item, {
      id: restaurant.id,
      name: restaurant.name,
      category: restaurant.category,
      imageUrl: restaurant.imageUrl,
    });

    if (!result.success && result.conflict) {
      const shouldReplace = window.confirm(
        `Your cart already contains items from ${cartRestaurant?.name}. Replace them with ${restaurant.name}?`,
      );

      if (!shouldReplace) {
        toast.error('Finish the current restaurant order before adding items from another restaurant.');
        return;
      }

      replaceCart(item, {
        id: restaurant.id,
        name: restaurant.name,
        category: restaurant.category,
        imageUrl: restaurant.imageUrl,
      });
      toast.success(`Started a new cart with ${item.name}`);
      return;
    }

    toast.success(`Added ${item.name} to cart`);
  };

  return (
    <div className="restaurant-detail-page page-container">
      <div className="restaurant-hero glass-panel">
        <div className="restaurant-hero-img">
          {restaurant.imageUrl ? (
             <img src={restaurant.imageUrl} alt={restaurant.name} />
          ) : (
             <div className="image-placeholder">🍽️</div>
          )}
        </div>
        <div className="restaurant-hero-info">
          <div className="restaurant-kicker">Restaurant</div>
          <h1>{restaurant.name}</h1>
          <p className="restaurant-meta-line text-muted">
            <span>{restaurant.category}</span>
            <span>⭐ {restaurant.rating.toFixed(1)}</span>
            <span>{restaurant.isOpen ? 'Open now' : 'Closed'}</span>
          </p>
          <p className="restaurant-desc">{restaurant.description}</p>
          <div className="restaurant-hero-actions">
            <button className="btn btn-primary" onClick={() => navigate('/cart')}>View Cart</button>
            <button className="btn btn-secondary" onClick={() => window.scrollTo({ top: 520, behavior: 'smooth' })}>Browse menu</button>
          </div>
          {!restaurant.isOpen && <div className="badge-danger mt-2">Currently Closed</div>}
        </div>
      </div>

      <div className="menu-shell">
        <div className="menu-sticky-bar glass-panel">
          <div className="menu-sticky-bar__label">Categories</div>
          <div className="menu-category-tabs" aria-label="Restaurant categories">
            {categoryLinks.map((category: { id: string; name: string }) => (
              <a key={category.id} href={`#${category.id}`} className="category-pill">
                {category.name}
              </a>
            ))}
            {visibleCategories.length === 0 && standaloneItems.length === 0 && (
              <span className="text-muted text-sm">No menu categories yet</span>
            )}
          </div>
        </div>

        <div className="menu-categories mt-6">
          {visibleCategories.map((cat: any) => (
            <section key={cat.id} id={cat.id} className="menu-category-section">
              <div className="category-title-row">
                <h2 className="category-title">{cat.name}</h2>
                <span className="category-count">{cat.menuItems?.length ?? 0} items</span>
              </div>
              <div className="menu-grid">
                {cat.menuItems?.map((item: any) => (
                  <article key={item.id} className="menu-item-card glass-panel">
                    <div className="menu-item-visual">
                      {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <div className="menu-item-thumb">🍕</div>}
                    </div>
                    <div className="menu-item-info">
                      <div className="menu-item-header-row">
                        <h3>{item.name}</h3>
                        <span className="menu-item-price font-medium">${item.price.toFixed(2)}</span>
                      </div>
                      <p className="text-muted text-sm">{item.description}</p>
                    </div>
                    {restaurant.isOpen && item.isAvailable ? (
                      <button
                        className="btn btn-primary add-to-cart-btn"
                        onClick={() => handleAddToCart(item)}
                      >
                        Add
                      </button>
                    ) : (
                      <button className="btn btn-secondary add-to-cart-btn" disabled>
                        Unavailable
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}

          {categories.length === 0 && standaloneItems.length > 0 && (
            <section id="all-items" className="menu-category-section">
              <div className="category-title-row">
                <h2 className="category-title">All dishes</h2>
                <span className="category-count">{standaloneItems.length} items</span>
              </div>
              <div className="menu-grid">
                {standaloneItems.map((item: any) => (
                  <article key={item.id} className="menu-item-card glass-panel">
                    <div className="menu-item-visual">
                      {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <div className="menu-item-thumb">🍕</div>}
                    </div>
                    <div className="menu-item-info">
                      <div className="menu-item-header-row">
                        <h3>{item.name}</h3>
                        <span className="menu-item-price font-medium">${item.price.toFixed(2)}</span>
                      </div>
                      <p className="text-muted text-sm">{item.description}</p>
                    </div>
                    {restaurant.isOpen && item.isAvailable ? (
                      <button
                        className="btn btn-primary add-to-cart-btn"
                        onClick={() => handleAddToCart(item)}
                      >
                        Add
                      </button>
                    ) : (
                      <button className="btn btn-secondary add-to-cart-btn" disabled>
                        Unavailable
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
