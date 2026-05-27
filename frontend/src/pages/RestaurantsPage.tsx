import { useQuery } from '@apollo/client/react';
import { GET_RESTAURANTS } from '../graphql/queries';
import { Link } from 'react-router-dom';
import './RestaurantsPage.css';
import { useState } from 'react';

export function RestaurantsPage() {
  const { data, loading, error } = useQuery<any>(GET_RESTAURANTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  if (loading) return <div className="loading-state">Loading restaurants...</div>;
  if (error) return <div className="error-state text-danger">Failed to load restaurants</div>;

  const restaurants = data?.restaurants || [];
  
  const filteredRestaurants = restaurants.filter((r: any) => {
    const description = r.description || '';
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter ? r.category === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(restaurants.map((r: any) => r.category)));

  return (
    <div className="restaurants-page page-container">
      <header className="page-header">
        <h1>Discover Restaurants</h1>
        <p className="text-muted">Find the best food in your area.</p>
      </header>

      <div className="filters-bar glass-panel mb-4">
        <input 
          type="text" 
          className="input-field search-input" 
          placeholder="Search restaurants or cuisines..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select 
          className="input-field category-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c: any) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="restaurants-grid">
        {filteredRestaurants.length === 0 ? (
          <div className="empty-state glass-panel">No restaurants found.</div>
        ) : (
          filteredRestaurants.map((restaurant: any) => (
            <Link to={`/restaurants/${restaurant.id}`} key={restaurant.id} className="restaurant-card glass-panel">
              <div className="restaurant-image">
                {restaurant.imageUrl ? (
                  <img src={restaurant.imageUrl} alt={restaurant.name} />
                ) : (
                  <div className="image-placeholder">🍽️</div>
                )}
                {!restaurant.isOpen && <div className="closed-badge">Closed</div>}
              </div>
              <div className="restaurant-details">
                <div className="restaurant-header">
                  <h3>{restaurant.name}</h3>
                  <span className="rating">⭐ {restaurant.rating.toFixed(1)}</span>
                </div>
                <p className="text-muted text-sm">{restaurant.category}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
