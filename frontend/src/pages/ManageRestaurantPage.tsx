import React, { useEffect, useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getMyRestaurant, createRestaurant, updateRestaurant,
  createCategory, deleteCategory, createMenuItem, updateMenuItem, deleteMenuItem,
  type BackendRestaurant, type BackendCategory, type BackendMenuItem,
} from '../services/graphql';
import {
  Store, Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight,
  ChefHat, Tag, Loader,
} from 'lucide-react';

// ─── Inline field editor ──────────────────────────────────────────────────────

const FieldRow: React.FC<{
  label: string;
  value: string;
  type?: string;
  placeholder?: string;
  onChange: (v: string) => void;
}> = ({ label, value, type = 'text', placeholder, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{ fontSize: 13, padding: '9px 12px', borderRadius: 'var(--radius-sm)' }}
    />
  </div>
);

// ─── Menu item modal ──────────────────────────────────────────────────────────

interface MenuItemFormProps {
  restaurantId: string;
  categories: BackendCategory[];
  item?: BackendMenuItem;
  onSave: (item: BackendMenuItem) => void;
  onClose: () => void;
}

const MenuItemForm: React.FC<MenuItemFormProps> = ({ restaurantId, categories, item, onSave, onClose }) => {
  const [name, setName]         = useState(item?.name ?? '');
  const [desc, setDesc]         = useState(item?.description ?? '');
  const [price, setPrice]       = useState(item ? String(item.price) : '');
  const [imgUrl, setImgUrl]     = useState(item?.imageUrl ?? '');
  const [catId, setCatId]       = useState(item?.categoryId ?? '');
  const [available, setAvail]   = useState(item?.isAvailable ?? true);
  const [saving, setSaving]     = useState(false);
  const { addToast }            = useToast();

  const handleSave = async () => {
    if (!name || !price) { addToast('error', 'Name and price are required'); return; }
    setSaving(true);
    try {
      const data = { name, description: desc, price: parseFloat(price), categoryId: catId || undefined, imageUrl: imgUrl || undefined, isAvailable: available };
      const saved = item
        ? await updateMenuItem(restaurantId, item.id, data)
        : await createMenuItem(restaurantId, data);
      onSave(saved);
    } catch (e) {
      addToast('error', 'Failed to save item', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(30,27,75,0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div className="glass-card" style={{ padding: 28, width: 420, maxWidth: '95vw' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16 }}>{item ? 'Edit Item' : 'Add Menu Item'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FieldRow label="Name" value={name} onChange={setName} placeholder="e.g. Grilled Chicken" />
          <FieldRow label="Description" value={desc} onChange={setDesc} placeholder="Short description…" />
          <FieldRow label="Price (TND)" type="number" value={price} onChange={setPrice} placeholder="0.00" />
          <FieldRow label="Image URL (optional)" value={imgUrl} onChange={setImgUrl} placeholder="https://..." />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</label>
            <select value={catId} onChange={e => setCatId(e.target.value)} style={{ fontSize: 13, padding: '9px 12px' }}>
              <option value="">— No category —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
            <span>Available for ordering</span>
            <button
              type="button"
              onClick={() => setAvail(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: available ? '#e03131' : 'var(--text-muted)', padding: 0 }}
            >
              {available ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
            </button>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} className="btn" style={{ flex: 1, padding: '10px', justifyContent: 'center', fontSize: 13 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ flex: 1, padding: '10px', justifyContent: 'center', fontSize: 13, opacity: saving ? 0.7 : 1 }}>
            {saving ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
            <span style={{ marginLeft: 6 }}>{saving ? 'Saving…' : 'Save'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export const ManageRestaurantPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [restaurant, setRestaurant] = useState<BackendRestaurant | null>(null);
  const [loading, setLoading]       = useState(true);

  // Setup form
  const [setupName, setSetupName]     = useState('');
  const [setupDesc, setSetupDesc]     = useState('');
  const [setupCat,  setSetupCat]      = useState('');
  const [setupAddr, setSetupAddr]     = useState('');
  const [setupPhone, setSetupPhone]   = useState('');
  const [setupImgUrl, setSetupImgUrl] = useState('');
  const [creating, setCreating]       = useState(false);

  // Edit state
  const [editing, setEditing]         = useState(false);
  const [editName, setEditName]       = useState('');
  const [editDesc, setEditDesc]       = useState('');
  const [editCat,  setEditCat]        = useState('');
  const [editAddr, setEditAddr]       = useState('');
  const [editPhone, setEditPhone]     = useState('');
  const [editImgUrl, setEditImgUrl]   = useState('');
  const [savingEdit, setSavingEdit]   = useState(false);

  // Category
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat]   = useState(false);
  const [showCatInput, setShowCatInput] = useState(false);

  // Menu item modal
  const [menuModal, setMenuModal]   = useState<{ open: boolean; item?: BackendMenuItem; catId?: string }>({ open: false });

  // Toggling open status
  const [toggling, setToggling]     = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    getMyRestaurant()
      .then(r => { if (r) setRestaurant(r); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // ── Create restaurant ──────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!setupName || !setupCat || !setupAddr) { addToast('error', 'Name, category, and address are required'); return; }
    setCreating(true);
    try {
      const r = await createRestaurant({ name: setupName, description: setupDesc, category: setupCat, address: setupAddr, phone: setupPhone, imageUrl: setupImgUrl || undefined });
      setRestaurant({ ...r, categories: [] });
      addToast('success', 'Restaurant created!', 'You can now add your menu.');
    } catch (e) { addToast('error', 'Failed to create restaurant', (e as Error).message); }
    finally { setCreating(false); }
  };

  // ── Edit restaurant info ───────────────────────────────────────────────────
  const startEdit = () => {
    if (!restaurant) return;
    setEditName(restaurant.name); setEditDesc(restaurant.description ?? '');
    setEditCat(restaurant.category); setEditAddr(restaurant.address);
    setEditPhone(restaurant.phone ?? ''); setEditImgUrl(restaurant.imageUrl ?? '');
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!restaurant) return;
    setSavingEdit(true);
    try {
      const updated = await updateRestaurant(restaurant.id, { name: editName, description: editDesc, category: editCat, address: editAddr, phone: editPhone, imageUrl: editImgUrl || undefined });
      setRestaurant(r => r ? { ...r, ...updated } : r);
      setEditing(false);
      addToast('success', 'Restaurant updated');
    } catch (e) { addToast('error', 'Failed to update', (e as Error).message); }
    finally { setSavingEdit(false); }
  };

  // ── Toggle open/closed ─────────────────────────────────────────────────────
  const handleToggleOpen = async () => {
    if (!restaurant) return;
    setToggling(true);
    try {
      await updateRestaurant(restaurant.id, { isOpen: !restaurant.isOpen });
      setRestaurant(r => r ? { ...r, isOpen: !r.isOpen } : r);
    } catch (e) { addToast('error', 'Failed to update status', (e as Error).message); }
    finally { setToggling(false); }
  };

  // ── Categories ─────────────────────────────────────────────────────────────
  const handleAddCategory = async () => {
    if (!restaurant || !newCatName.trim()) return;
    setAddingCat(true);
    try {
      const cat = await createCategory(restaurant.id, newCatName.trim());
      setRestaurant(r => r ? { ...r, categories: [...(r.categories ?? []), { ...cat, menuItems: [] }] } : r);
      setNewCatName(''); setShowCatInput(false);
    } catch (e) { addToast('error', 'Failed to add category', (e as Error).message); }
    finally { setAddingCat(false); }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!window.confirm('Delete this category and all its items?')) return;
    try {
      await deleteCategory(catId);
      setRestaurant(r => r ? { ...r, categories: (r.categories ?? []).filter(c => c.id !== catId) } : r);
    } catch (e) { addToast('error', 'Failed to delete category', (e as Error).message); }
  };

  // ── Menu items ─────────────────────────────────────────────────────────────
  const handleSaveMenuItem = (saved: BackendMenuItem) => {
    setRestaurant(r => {
      if (!r) return r;
      const cats = (r.categories ?? []).map(c => {
        if (c.id !== saved.categoryId) return c;
        const exists = (c.menuItems ?? []).some(i => i.id === saved.id);
        return {
          ...c,
          menuItems: exists
            ? (c.menuItems ?? []).map(i => i.id === saved.id ? saved : i)
            : [...(c.menuItems ?? []), saved],
        };
      });
      // If no category matched, put in uncategorised list
      const inCat = cats.some(c => (c.menuItems ?? []).some(i => i.id === saved.id));
      if (!inCat) {
        return { ...r, categories: cats, menuItems: (r.menuItems ?? []).map(i => i.id === saved.id ? saved : i).concat((r.menuItems ?? []).some(i => i.id === saved.id) ? [] : [saved]) };
      }
      return { ...r, categories: cats };
    });
    setMenuModal({ open: false });
    addToast('success', menuModal.item ? 'Item updated' : 'Item added');
  };

  const handleDeleteMenuItem = async (itemId: string) => {
    if (!restaurant || !window.confirm('Delete this menu item?')) return;
    try {
      await deleteMenuItem(restaurant.id, itemId);
      setRestaurant(r => {
        if (!r) return r;
        return {
          ...r,
          categories: (r.categories ?? []).map(c => ({
            ...c, menuItems: (c.menuItems ?? []).filter(i => i.id !== itemId),
          })),
        };
      });
    } catch (e) { addToast('error', 'Failed to delete item', (e as Error).message); }
  };

  const handleToggleAvailability = async (item: BackendMenuItem) => {
    if (!restaurant) return;
    try {
      const updated = await updateMenuItem(restaurant.id, item.id, { isAvailable: !item.isAvailable });
      handleSaveMenuItem(updated);
    } catch (e) { addToast('error', 'Failed to update availability', (e as Error).message); }
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-layout">
        <Sidebar />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--soft-purple)' }} />
        </main>
      </div>
    );
  }

  // ─── Setup form (no restaurant yet) ───────────────────────────────────────
  if (!restaurant) {
    return (
      <div className="page-layout">
        <Sidebar />
        <main className="main-content">
          <div style={{ maxWidth: 540, margin: '0 auto' }}>
            <div style={{ marginBottom: 32 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>Restaurant Setup</p>
              <h1 style={{ fontSize: '1.9rem' }}>Create Your Restaurant</h1>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
                Fill in your restaurant profile so customers can discover and order from you.
              </p>
            </div>

            <div className="glass-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FieldRow label="Restaurant Name" value={setupName} onChange={setSetupName} placeholder="e.g. Bella Italia" />
              <FieldRow label="Description" value={setupDesc} onChange={setSetupDesc} placeholder="A short description of your restaurant" />
              <FieldRow label="Cuisine / Category" value={setupCat} onChange={setSetupCat} placeholder="e.g. Italian, Japanese, Tunisian…" />
              <FieldRow label="Address" value={setupAddr} onChange={setSetupAddr} placeholder="Full street address" />
              <FieldRow label="Phone (optional)" value={setupPhone} onChange={setSetupPhone} placeholder="+216 XX XXX XXX" />
              <FieldRow label="Cover Image URL (optional)" value={setupImgUrl} onChange={setSetupImgUrl} placeholder="https://..." />
              {setupImgUrl && (
                <img src={setupImgUrl} alt="preview" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }} />
              )}

              <button
                onClick={handleCreate}
                disabled={creating}
                className="btn btn-primary"
                style={{ marginTop: 8, padding: '12px', justifyContent: 'center', fontSize: 14, opacity: creating ? 0.7 : 1 }}
              >
                {creating ? <Loader size={15} /> : <Store size={15} />}
                <span style={{ marginLeft: 8 }}>{creating ? 'Creating…' : 'Create Restaurant'}</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ─── Management UI ─────────────────────────────────────────────────────────
  const allItems = (restaurant.categories ?? []).flatMap(c => c.menuItems ?? []);
  const totalItems = allItems.length;
  const availableItems = allItems.filter(i => i.isAvailable).length;

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Restaurant Management</p>
            <h1 style={{ fontSize: '1.9rem' }}>{restaurant.name}</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{restaurant.category} · {restaurant.address}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Open / Closed toggle */}
            <button
              onClick={handleToggleOpen}
              disabled={toggling}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                background: restaurant.isOpen ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)',
                color: restaurant.isOpen ? '#10b981' : '#ef4444',
                transition: 'all 0.2s',
              }}
            >
              {restaurant.isOpen ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              {restaurant.isOpen ? 'Open' : 'Closed'}
            </button>
            <button onClick={startEdit} className="btn" style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Pencil size={14} /> Edit Info
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Categories', value: (restaurant.categories ?? []).length },
            { label: 'Menu Items', value: totalItems },
            { label: 'Available Now', value: availableItems },
          ].map(s => (
            <div key={s.label} className="glass-card" style={{ padding: '18px 20px' }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</p>
              <p style={{ fontSize: 26, fontWeight: 300, fontFamily: 'var(--font-display)', color: '#991b1b' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Menu management */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 17 }}>Menu</h2>
          <button
            onClick={() => setShowCatInput(v => !v)}
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={14} /> Add Category
          </button>
        </div>

        {showCatInput && (
          <div className="glass-card" style={{ padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Category name (e.g. Starters, Mains…)"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); }}
              style={{ flex: 1, fontSize: 13 }}
              autoFocus
            />
            <button onClick={handleAddCategory} disabled={addingCat} className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              {addingCat ? <Loader size={13} /> : <Check size={13} />}
              {addingCat ? 'Adding…' : 'Add'}
            </button>
            <button onClick={() => { setShowCatInput(false); setNewCatName(''); }} className="btn" style={{ padding: '8px 10px' }}>
              <X size={14} />
            </button>
          </div>
        )}

        {(restaurant.categories ?? []).length === 0 ? (
          <div className="glass-card" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <ChefHat size={32} style={{ margin: '0 auto 12px', opacity: 0.35 }} />
            <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No menu yet</p>
            <p style={{ fontSize: 13 }}>Add a category, then add items to it.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {(restaurant.categories ?? []).map(cat => (
              <div key={cat.id} className="glass-card" style={{ padding: '20px 22px' }}>
                {/* Category header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Tag size={14} style={{ color: '#991b1b' }} />
                    <h3 style={{ fontSize: 15 }}>{cat.name}</h3>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({(cat.menuItems ?? []).length} items)</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setMenuModal({ open: true, catId: cat.id })}
                      className="btn"
                      style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      <Plus size={12} /> Add Item
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px 8px', borderRadius: 'var(--radius-sm)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Menu items */}
                {(cat.menuItems ?? []).length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 4 }}>No items yet — click Add Item above.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(cat.menuItems ?? []).map(item => (
                      <div key={item.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                        background: item.isAvailable ? 'rgba(255,255,255,0.5)' : 'rgba(239,68,68,0.04)',
                        border: `1px solid ${item.isAvailable ? 'rgba(220,38,38,0.10)' : 'rgba(239,68,68,0.15)'}`,
                        opacity: item.isAvailable ? 1 : 0.65,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{item.name}</p>
                          {item.description && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.description}</p>}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#991b1b', flexShrink: 0 }}>{item.price.toFixed(2)} TND</span>

                        {/* Availability toggle */}
                        <button
                          onClick={() => handleToggleAvailability(item)}
                          title={item.isAvailable ? 'Mark unavailable' : 'Mark available'}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: item.isAvailable ? '#10b981' : 'var(--text-muted)', padding: '4px 6px' }}
                        >
                          {item.isAvailable ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>

                        <button
                          onClick={() => setMenuModal({ open: true, item })}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e03131', padding: '4px' }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteMenuItem(item.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Edit info modal */}
        {editing && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(30,27,75,0.4)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}>
            <div className="glass-card" style={{ padding: 28, width: 440, maxWidth: '95vw' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3>Edit Restaurant</h3>
                <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <FieldRow label="Name" value={editName} onChange={setEditName} />
                <FieldRow label="Description" value={editDesc} onChange={setEditDesc} />
                <FieldRow label="Cuisine / Category" value={editCat} onChange={setEditCat} />
                <FieldRow label="Address" value={editAddr} onChange={setEditAddr} />
                <FieldRow label="Phone" value={editPhone} onChange={setEditPhone} />
                <FieldRow label="Cover Image URL" value={editImgUrl} onChange={setEditImgUrl} placeholder="https://..." />
                {editImgUrl && (
                  <img src={editImgUrl} alt="preview" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }} />
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => setEditing(false)} className="btn" style={{ flex: 1, padding: '10px', justifyContent: 'center' }}>Cancel</button>
                <button onClick={handleSaveEdit} disabled={savingEdit} className="btn btn-primary" style={{ flex: 1, padding: '10px', justifyContent: 'center', opacity: savingEdit ? 0.7 : 1 }}>
                  {savingEdit ? <Loader size={14} /> : <Check size={14} />}
                  <span style={{ marginLeft: 6 }}>{savingEdit ? 'Saving…' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Menu item modal */}
        {menuModal.open && (
          <MenuItemForm
            restaurantId={restaurant.id}
            categories={restaurant.categories ?? []}
            item={menuModal.item}
            onSave={handleSaveMenuItem}
            onClose={() => setMenuModal({ open: false })}
          />
        )}
      </main>
    </div>
  );
};
