// src/pages/RestaurantsPage.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { getRestaurants, type Restaurant } from '../services/graphql';
import { Clock, Search, UtensilsCrossed } from 'lucide-react';

const RestaurantCard: React.FC<{ restaurant: Restaurant }> = ({ restaurant: r }) => (
  <Link to={`/restaurants/${r.id}`} style={{ textDecoration: 'none' }}>
    <div
      className="glass-card"
      style={{ overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', height: '100%' }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 16px 48px rgba(99,88,200,0.18)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--glass-shadow)';
      }}
    >
      <div style={{ height: 160, overflow: 'hidden', position: 'relative' }}>
        <img
          src={r.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'}
          alt={r.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        />
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: r.isOpen ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.85)',
          color: '#fff', fontSize: 11, fontWeight: 500,
          padding: '3px 9px', borderRadius: 100, backdropFilter: 'blur(8px)',
        }}>
          {r.isOpen ? 'Open' : 'Closed'}
        </div>
        {r.deliveryFee === 0 && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            background: 'rgba(153,27,27,0.90)', color: '#fff',
            fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 100,
            backdropFilter: 'blur(8px)',
          }}>
            Free delivery
          </div>
        )}
      </div>

      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <h3 style={{ fontSize: 15, fontWeight: 500 }}>{r.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 13, flexShrink: 0 }}>
            <span style={{ color: '#f59e0b' }}>★</span>
            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{r.rating}</span>
            {r.reviewCount > 0 && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({r.reviewCount})</span>}
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{r.description}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {r.cuisine && <span className="badge badge-purple">{r.cuisine}</span>}
          <span className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Clock size={10} /> {r.deliveryTime} min</span>
          <span className="badge badge-blue">
            {r.deliveryFee === 0 ? 'Free delivery' : `${r.deliveryFee.toFixed(2)} TND delivery`}
          </span>
        </div>
      </div>
    </div>
  </Link>
);

const CUISINES = ['All', 'Italian', 'Japanese', 'American', 'Indian', 'Healthy', 'Chinese'];

export const RestaurantsPage: React.FC = () => {
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cuisine, setCuisine] = useState('All');
  const [sortBy, setSortBy] = useState<'rating' | 'deliveryTime' | 'deliveryFee'>('rating');
  const [showOpenOnly, setShowOpenOnly] = useState(false);

  useEffect(() => {
    getRestaurants().then(d => setAllRestaurants(d.restaurants)).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = [...allRestaurants];
    if (search) list = list.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.cuisine.toLowerCase().includes(search.toLowerCase()));
    if (cuisine !== 'All') list = list.filter(r => r.cuisine === cuisine);
    if (showOpenOnly) list = list.filter(r => r.isOpen);
    list.sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'deliveryTime') return a.deliveryTime - b.deliveryTime;
      return a.deliveryFee - b.deliveryFee;
    });
    return list;
  }, [allRestaurants, search, cuisine, sortBy, showOpenOnly]);

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content">
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: '1.9rem', marginBottom: 6 }}>Browse Restaurants</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{loading ? '…' : `${filtered.length} restaurants available`}</p>
        </div>

        {/* Search & filters */}
        <div className="glass-card" style={{ padding: '18px 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search restaurants or cuisine…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 36 }}
              />
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} style={{ width: 'auto', flex: '0 0 auto' }}>
              <option value="rating">Sort: Top Rated</option>
              <option value="deliveryTime">Sort: Fastest</option>
              <option value="deliveryFee">Sort: Cheapest Delivery</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0 }}>
              <input type="checkbox" checked={showOpenOnly} onChange={e => setShowOpenOnly(e.target.checked)} style={{ width: 'auto', cursor: 'pointer' }} />
              Open now
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {CUISINES.map(c => (
              <button
                key={c}
                onClick={() => setCuisine(c)}
                className="btn"
                style={{
                  padding: '6px 14px', fontSize: 13,
                  background: cuisine === c ? 'linear-gradient(135deg, var(--soft-blue), var(--soft-purple))' : 'rgba(255,255,255,0.5)',
                  color: cuisine === c ? '#fff' : 'var(--text-secondary)',
                  border: cuisine === c ? 'none' : '1px solid rgba(220,38,38,0.18)',
                  boxShadow: cuisine === c ? '0 2px 10px rgba(220,38,38,0.25)' : 'none',
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: 14 }}>Loading restaurants…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <UtensilsCrossed size={48} style={{ margin: '0 auto 16px', opacity: 0.25 }} />
            <p style={{ fontSize: 16 }}>No restaurants found</p>
            <p style={{ fontSize: 13 }}>Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid-3">
            {filtered.map(r => <RestaurantCard key={r.id} restaurant={r} />)}
          </div>
        )}
      </main>
    </div>
  );
};
