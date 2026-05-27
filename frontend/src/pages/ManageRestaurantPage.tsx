import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { GET_RESTAURANTS, GET_RESTAURANT } from '../graphql/queries';
import { api } from '../lib/api';
import './ManageRestaurantPage.css';

interface RestaurantFormState {
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  address: string;
  phone: string;
}

interface CategoryFormState {
  name: string;
}

interface MenuItemFormState {
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  categoryId: string;
  isAvailable: boolean;
}

const emptyRestaurantForm: RestaurantFormState = {
  name: '',
  description: '',
  category: '',
  imageUrl: '',
  address: '',
  phone: '',
};

const emptyCategoryForm: CategoryFormState = { name: '' };

const emptyMenuItemForm: MenuItemFormState = {
  name: '',
  description: '',
  price: '',
  imageUrl: '',
  categoryId: '',
  isAvailable: true,
};

export function ManageRestaurantPage() {
  const { user } = useAuth();
  const { data: restaurantsData, loading: restaurantsLoading, refetch: refetchRestaurants } = useQuery<any>(GET_RESTAURANTS);

  const restaurant = restaurantsData?.restaurants?.find((item: any) => item.ownerId === user?.id) ?? null;
  const restaurantId = restaurant?.id;

  const {
    data: restaurantData,
    loading: restaurantLoading,
    refetch: refetchRestaurant,
  } = useQuery<any>(GET_RESTAURANT, {
    variables: { id: restaurantId },
    skip: !restaurantId,
    fetchPolicy: 'network-only',
  });

  const [restaurantForm, setRestaurantForm] = useState<RestaurantFormState>(emptyRestaurantForm);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm);
  const [menuItemForm, setMenuItemForm] = useState<MenuItemFormState>(emptyMenuItemForm);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingMenuItemId, setEditingMenuItemId] = useState<string | null>(null);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [openMenuFormCategoryId, setOpenMenuFormCategoryId] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const restaurantDetails = restaurantData?.restaurant ?? null;
  const categories = restaurantDetails?.categories ?? [];
  const uncategorizedItems = restaurantDetails?.menuItems ?? [];
  const categoriesWithIds = categories.map((category: any) => ({
    id: category.id,
    name: category.name,
    count: category.menuItems?.length ?? 0,
  }));

  const handleImageFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    onImageUrlChange: (value: string) => void,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImageUrlChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const resetCategoryForm = () => {
    setCategoryForm(emptyCategoryForm);
    setEditingCategoryId(null);
    setIsCategoryFormOpen(false);
  };

  const openCategoryForm = (category?: any) => {
    if (category) {
      setEditingCategoryId(category.id);
      setCategoryForm({ name: category.name });
    } else {
      setEditingCategoryId(null);
      setCategoryForm(emptyCategoryForm);
    }
    setIsCategoryFormOpen(true);
  };

  const resetMenuItemForm = () => {
    setMenuItemForm(emptyMenuItemForm);
    setEditingMenuItemId(null);
    setOpenMenuFormCategoryId(null);
  };

  const openMenuItemForm = (categoryId: string, menuItem?: any) => {
    setOpenMenuFormCategoryId(categoryId);
    setActiveCategoryId(categoryId || 'uncategorized');

    if (menuItem) {
      setEditingMenuItemId(menuItem.id);
      setMenuItemForm({
        name: menuItem.name,
        description: menuItem.description ?? '',
        price: String(menuItem.price),
        imageUrl: menuItem.imageUrl ?? '',
        categoryId: menuItem.categoryId ?? categoryId,
        isAvailable: menuItem.isAvailable,
      });
      return;
    }

    setEditingMenuItemId(null);
    setMenuItemForm({
      ...emptyMenuItemForm,
      categoryId,
    });
  };

  const handleRestaurantCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await api.post('/restaurants', restaurantForm);
      toast.success('Restaurant created');
      setRestaurantForm(emptyRestaurantForm);
      await refetchRestaurants();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create restaurant');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestaurantToggle = async () => {
    if (!restaurantId || !restaurantDetails) return;
    setIsSaving(true);
    try {
      await api.patch(`/restaurants/${restaurantId}`, { isOpen: !restaurantDetails.isOpen });
      toast.success(`Restaurant ${restaurantDetails.isOpen ? 'closed' : 'opened'}`);
      await Promise.all([refetchRestaurant(), refetchRestaurants()]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update restaurant');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCategorySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!restaurantId) return;

    setIsSaving(true);
    try {
      if (editingCategoryId) {
        await api.patch(`/restaurants/categories/${editingCategoryId}`, { name: categoryForm.name });
        toast.success('Category updated');
      } else {
        const createdCategory = await api.post<{ id: string; name: string }>(`/restaurants/${restaurantId}/categories`, { name: categoryForm.name });
        toast.success('Category created');
        setActiveCategoryId(createdCategory.id);
      }
      resetCategoryForm();
      await refetchRestaurant();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCategoryDelete = async (categoryId: string) => {
    if (!window.confirm('Delete this category?')) return;
    setIsSaving(true);
    try {
      await api.delete(`/restaurants/categories/${categoryId}`);
      toast.success('Category deleted');
      if (editingCategoryId === categoryId) {
        resetCategoryForm();
      }
      await refetchRestaurant();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMenuItemSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!restaurantId) return;

    setIsSaving(true);
    try {
      const payload = {
        name: menuItemForm.name,
        description: menuItemForm.description || undefined,
        price: Number(menuItemForm.price),
        imageUrl: menuItemForm.imageUrl || undefined,
        isAvailable: menuItemForm.isAvailable,
        categoryId: menuItemForm.categoryId || undefined,
      };

      if (editingMenuItemId) {
        await api.patch(`/restaurants/menu-items/${editingMenuItemId}`, payload);
        toast.success('Menu item updated');
      } else {
        await api.post(`/restaurants/${restaurantId}/menu-items`, payload);
        toast.success('Menu item created');
      }

      resetMenuItemForm();
      await refetchRestaurant();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save menu item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMenuItemDelete = async (menuItemId: string) => {
    if (!window.confirm('Delete this menu item?')) return;
    setIsSaving(true);
    try {
      await api.delete(`/restaurants/menu-items/${menuItemId}`);
      toast.success('Menu item deleted');
      if (editingMenuItemId === menuItemId) {
        resetMenuItemForm();
      }
      await refetchRestaurant();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete menu item');
    } finally {
      setIsSaving(false);
    }
  };

  if (restaurantsLoading || (restaurantId && restaurantLoading)) {
    return <div className="loading-state">Loading restaurant management...</div>;
  }

  if (!restaurant) {
    return (
      <div className="manage-restaurant-page page-container">
        <header className="page-header">
          <h1>Set up your restaurant</h1>
          <p className="text-muted">Create the restaurant profile before adding categories and menu items.</p>
        </header>

        <form className="glass-panel setup-form" onSubmit={handleRestaurantCreate}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="restaurant-name">Restaurant name</label>
              <input
                id="restaurant-name"
                className="input-field"
                value={restaurantForm.name}
                onChange={event => setRestaurantForm(prev => ({ ...prev, name: event.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="restaurant-category">Cuisine category</label>
              <input
                id="restaurant-category"
                className="input-field"
                value={restaurantForm.category}
                onChange={event => setRestaurantForm(prev => ({ ...prev, category: event.target.value }))}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="restaurant-description">Description</label>
            <textarea
              id="restaurant-description"
              className="input-field"
              value={restaurantForm.description}
              onChange={event => setRestaurantForm(prev => ({ ...prev, description: event.target.value }))}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="restaurant-address">Address</label>
              <input
                id="restaurant-address"
                className="input-field"
                value={restaurantForm.address}
                onChange={event => setRestaurantForm(prev => ({ ...prev, address: event.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="restaurant-phone">Phone</label>
              <input
                id="restaurant-phone"
                className="input-field"
                value={restaurantForm.phone}
                onChange={event => setRestaurantForm(prev => ({ ...prev, phone: event.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="restaurant-image-file">Photo from computer</label>
            <label className="photo-picker" htmlFor="restaurant-image-file">
              Parcourir une photo
            </label>
            <input
              id="restaurant-image-file"
              type="file"
              accept="image/*"
              className="photo-picker__input"
              onChange={event => handleImageFileChange(event, value => setRestaurantForm(prev => ({ ...prev, imageUrl: value })))}
            />
            <p className="photo-picker__note">Choose a photo from your PC. It will be saved in the restaurant image field.</p>
          </div>

          <div className="form-group">
            <label htmlFor="restaurant-image">Image URL</label>
            <input
              id="restaurant-image"
              className="input-field"
              value={restaurantForm.imageUrl}
              onChange={event => setRestaurantForm(prev => ({ ...prev, imageUrl: event.target.value }))}
            />
            {restaurantForm.imageUrl && (
              <div className="photo-preview">
                <img src={restaurantForm.imageUrl} alt="Restaurant preview" />
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? 'Creating...' : 'Create restaurant'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="manage-restaurant-page page-container">
      <header className="page-header manage-header">
        <div>
          <h1>{restaurantDetails?.name ?? restaurant.name}</h1>
          <p className="text-muted">Manage categories and items in a bar-first layout.</p>
        </div>
        <button
          type="button"
          className={`btn ${restaurantDetails?.isOpen ? 'btn-secondary' : 'btn-primary'}`}
          onClick={handleRestaurantToggle}
          disabled={isSaving}
        >
          {restaurantDetails?.isOpen ? 'Close restaurant' : 'Open restaurant'}
        </button>
      </header>

      <section className="restaurant-info-card glass-panel">
        <div className="restaurant-avatar">🍽️</div>
        <div className="restaurant-meta">
          <h2>{restaurantDetails?.name ?? restaurant.name}</h2>
          <div className="meta-row">
            <span>{restaurantDetails?.category ?? restaurant.category}</span>
            <span>{restaurantDetails?.address ?? restaurant.address}</span>
            <span>{restaurantDetails?.phone ?? restaurant.phone ?? 'No phone'}</span>
          </div>
        </div>
        <div className={`status-badge ${restaurantDetails?.isOpen ? 'open' : 'closed'}`}>
          {restaurantDetails?.isOpen ? 'Open' : 'Closed'}
        </div>
      </section>

      <section className="manage-toolbar glass-panel">
        <div className="manage-toolbar__top">
          <div className="menu-sticky-bar__label">Categories</div>
          <button
            type="button"
            className="category-pill category-pill--action"
            onClick={() => openCategoryForm()}
          >
            + Add category
          </button>
        </div>

        <div className="category-bar">
          {categoriesWithIds.length === 0 ? (
            <span className="category-bar__hint text-muted">No categories yet. Add one to start organizing your menu.</span>
          ) : (
            categoriesWithIds.map((category: any) => (
              <button
                key={category.id}
                type="button"
                className={`category-pill ${activeCategoryId === category.id ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveCategoryId(category.id);
                  document.getElementById(category.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                <span>{category.name}</span>
                <span className="category-pill__count">{category.count}</span>
              </button>
            ))
          )}
        </div>

        {isCategoryFormOpen && (
          <form className="category-inline-form" onSubmit={handleCategorySubmit}>
            <input
              className="input-field"
              placeholder="Category name"
              value={categoryForm.name}
              onChange={event => setCategoryForm({ name: event.target.value })}
              required
            />
            <div className="category-inline-form__actions">
              <button type="button" className="btn btn-secondary" onClick={resetCategoryForm}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {editingCategoryId ? 'Update category' : 'Add category'}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="menu-sections">
        {categoriesWithIds.map((category: any) => {
          const items = categories.find((item: any) => item.id === category.id)?.menuItems ?? [];
          const isFormOpen = openMenuFormCategoryId === category.id;

          return (
            <section key={category.id} id={category.id} className={`menu-category-section glass-panel ${activeCategoryId === category.id ? 'is-active' : ''}`}>
              <div className="menu-category-section__header">
                <div>
                  <h2>{category.name}</h2>
                  <p className="text-muted text-sm">{items.length} items in this category</p>
                </div>
                <div className="menu-category-section__actions">
                  <button type="button" className="btn btn-secondary" onClick={() => openCategoryForm(category)}>
                    Edit category
                  </button>
                  <button type="button" className="btn btn-secondary text-danger" onClick={() => handleCategoryDelete(category.id)}>
                    Delete
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => openMenuItemForm(category.id)}>
                    + Add menu item
                  </button>
                </div>
              </div>

              {isFormOpen && (
                <form className="menu-item-inline-form glass-panel" onSubmit={handleMenuItemSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor={`menu-name-${category.id}`}>Name</label>
                      <input
                        id={`menu-name-${category.id}`}
                        className="input-field"
                        value={menuItemForm.name}
                        onChange={event => setMenuItemForm(prev => ({ ...prev, name: event.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor={`menu-price-${category.id}`}>Price</label>
                      <input
                        id={`menu-price-${category.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        className="input-field"
                        value={menuItemForm.price}
                        onChange={event => setMenuItemForm(prev => ({ ...prev, price: event.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor={`menu-description-${category.id}`}>Description</label>
                    <textarea
                      id={`menu-description-${category.id}`}
                      className="input-field"
                      value={menuItemForm.description}
                      onChange={event => setMenuItemForm(prev => ({ ...prev, description: event.target.value }))}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor={`menu-category-${category.id}`}>Category</label>
                      <select
                        id={`menu-category-${category.id}`}
                        className="input-field"
                        value={menuItemForm.categoryId}
                        onChange={event => setMenuItemForm(prev => ({ ...prev, categoryId: event.target.value }))}
                      >
                        <option value="">No category</option>
                        {categoriesWithIds.map((categoryOption: any) => (
                          <option key={categoryOption.id} value={categoryOption.id}>{categoryOption.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor={`menu-image-file-${category.id}`}>Photo from computer</label>
                      <label className="photo-picker" htmlFor={`menu-image-file-${category.id}`}>
                        Parcourir une photo
                      </label>
                      <input
                        id={`menu-image-file-${category.id}`}
                        type="file"
                        accept="image/*"
                        className="photo-picker__input"
                        onChange={event => handleImageFileChange(event, value => setMenuItemForm(prev => ({ ...prev, imageUrl: value })))}
                      />
                      <p className="photo-picker__note">Choose a menu photo from your PC.</p>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor={`menu-image-${category.id}`}>Image URL</label>
                      <input
                        id={`menu-image-${category.id}`}
                        className="input-field"
                        value={menuItemForm.imageUrl}
                        onChange={event => setMenuItemForm(prev => ({ ...prev, imageUrl: event.target.value }))}
                      />
                      {menuItemForm.imageUrl && (
                        <div className="photo-preview photo-preview--small">
                          <img src={menuItemForm.imageUrl} alt="Menu item preview" />
                        </div>
                      )}
                    </div>

                  <label className="checkbox-group">
                    <input
                      type="checkbox"
                      checked={menuItemForm.isAvailable}
                      onChange={event => setMenuItemForm(prev => ({ ...prev, isAvailable: event.target.checked }))}
                    />
                    Available for ordering
                  </label>

                  <div className="category-inline-form__actions">
                    <button type="button" className="btn btn-secondary" onClick={resetMenuItemForm}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>
                      {editingMenuItemId ? 'Update menu item' : 'Add menu item'}
                    </button>
                  </div>
                </form>
              )}

              <div className="menu-items-grid">
                {items.length === 0 ? (
                  <div className="empty-state">No items in this category yet.</div>
                ) : (
                  items.map((menuItem: any) => (
                    <article key={menuItem.id} className="manage-menu-item-card glass-panel">
                      <div className="menu-item-card-visual">
                        {menuItem.imageUrl ? (
                          <img src={menuItem.imageUrl} alt={menuItem.name} />
                        ) : (
                          <div className="menu-item-card-placeholder">🍽️</div>
                        )}
                      </div>
                      <div className="menu-item-header">
                        <h3>{menuItem.name}</h3>
                        <span className={`availability-dot ${menuItem.isAvailable ? 'available' : 'unavailable'}`} />
                      </div>
                      <p className="menu-item-desc">{menuItem.description || 'No description provided'}</p>
                      <div className="menu-item-footer">
                        <span className="menu-item-price-tag">${Number(menuItem.price).toFixed(2)}</span>
                        <span className="menu-item-category-tag">{category.name}</span>
                      </div>
                      <div className="menu-item-card-actions">
                        <button type="button" className="action-btn" onClick={() => openMenuItemForm(category.id, menuItem)}>
                          Edit
                        </button>
                        <button type="button" className="action-btn delete-btn" onClick={() => handleMenuItemDelete(menuItem.id)}>
                          Delete
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        })}

        {uncategorizedItems.length > 0 && (
          <section id="uncategorized" className={`menu-category-section glass-panel ${activeCategoryId === 'uncategorized' ? 'is-active' : ''}`}>
            <div className="menu-category-section__header">
              <div>
                <h2>Uncategorized</h2>
                <p className="text-muted text-sm">{uncategorizedItems.length} items without category</p>
              </div>
              <div className="menu-category-section__actions">
                <button type="button" className="btn btn-primary" onClick={() => openMenuItemForm('')}>
                  + Add menu item
                </button>
              </div>
            </div>

            {openMenuFormCategoryId === '' && (
              <form className="menu-item-inline-form glass-panel" onSubmit={handleMenuItemSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="uncat-menu-name">Name</label>
                    <input
                      id="uncat-menu-name"
                      className="input-field"
                      value={menuItemForm.name}
                      onChange={event => setMenuItemForm(prev => ({ ...prev, name: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="uncat-menu-price">Price</label>
                    <input
                      id="uncat-menu-price"
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-field"
                      value={menuItemForm.price}
                      onChange={event => setMenuItemForm(prev => ({ ...prev, price: event.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="uncat-menu-image-file">Photo from computer</label>
                  <label className="photo-picker" htmlFor="uncat-menu-image-file">
                    Parcourir une photo
                  </label>
                  <input
                    id="uncat-menu-image-file"
                    type="file"
                    accept="image/*"
                    className="photo-picker__input"
                    onChange={event => handleImageFileChange(event, value => setMenuItemForm(prev => ({ ...prev, imageUrl: value })))}
                  />
                  <p className="photo-picker__note">Choose a photo from your PC for this item.</p>
                </div>

                <div className="form-group">
                  <label htmlFor="uncat-menu-image">Image URL</label>
                  <input
                    id="uncat-menu-image"
                    className="input-field"
                    value={menuItemForm.imageUrl}
                    onChange={event => setMenuItemForm(prev => ({ ...prev, imageUrl: event.target.value }))}
                  />
                  {menuItemForm.imageUrl && (
                    <div className="photo-preview photo-preview--small">
                      <img src={menuItemForm.imageUrl} alt="Menu item preview" />
                    </div>
                  )}
                </div>

                <div className="category-inline-form__actions">
                  <button type="button" className="btn btn-secondary" onClick={resetMenuItemForm}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSaving}>
                    {editingMenuItemId ? 'Update menu item' : 'Add menu item'}
                  </button>
                </div>
              </form>
            )}

            <div className="menu-items-grid">
              {uncategorizedItems.map((menuItem: any) => (
                <article key={menuItem.id} className="manage-menu-item-card glass-panel">
                  <div className="menu-item-card-visual">
                    {menuItem.imageUrl ? (
                      <img src={menuItem.imageUrl} alt={menuItem.name} />
                    ) : (
                      <div className="menu-item-card-placeholder">🍽️</div>
                    )}
                  </div>
                  <div className="menu-item-header">
                    <h3>{menuItem.name}</h3>
                    <span className={`availability-dot ${menuItem.isAvailable ? 'available' : 'unavailable'}`} />
                  </div>
                  <p className="menu-item-desc">{menuItem.description || 'No description provided'}</p>
                  <div className="menu-item-footer">
                    <span className="menu-item-price-tag">${Number(menuItem.price).toFixed(2)}</span>
                    <span className="menu-item-category-tag">No category</span>
                  </div>
                  <div className="menu-item-card-actions">
                    <button type="button" className="action-btn" onClick={() => openMenuItemForm('', menuItem)}>
                      Edit
                    </button>
                    <button type="button" className="action-btn delete-btn" onClick={() => handleMenuItemDelete(menuItem.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>
    </div>
  );
}