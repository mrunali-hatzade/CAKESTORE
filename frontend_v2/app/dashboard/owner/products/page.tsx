'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useOwner } from '@/context/OwnerContext';
import {
  Cake,
  Plus,
  Trash2,
  Edit2,
  Tag,
  Search,
  X,
  Scale,
  Upload,
  Link as LinkIcon,
  Sparkles,
  Award,
  Egg,
  Percent,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import { productsApi } from '@/lib/api/products';
import { mediaApi } from '@/lib/api/media';
import { categoriesApi } from '@/lib/api/categories';
import {
  Product,
  ProductVariant,
  ProductImage,
  ProductHighlight,
  Category,
  CreateProductRequest,
} from '@/types/product';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { CategoryManagerModal } from '@/components/owner/CategoryManagerModal';

const FALLBACK_CAKE =
  'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=400&q=80';

const PRESET_IMAGES = [
  { label: '🍫 Chocolate', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80' },
  { label: '🍓 Red Velvet', url: 'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?auto=format&fit=crop&w=800&q=80' },
  { label: '🥭 Mango', url: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80' },
  { label: '🍪 Biscoff', url: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=800&q=80' },
  { label: '🧁 Cupcakes', url: 'https://images.unsplash.com/photo-1587668178277-295251f900ce?auto=format&fit=crop&w=800&q=80' },
];

const WEIGHT_PRESETS = [
  { label: '500g', defaultMultiplier: 1 },
  { label: '1 kg', defaultMultiplier: 1.85 },
  { label: '1.5 kg', defaultMultiplier: 2.7 },
  { label: '2 kg', defaultMultiplier: 3.5 },
];

export default function OwnerProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Media tab
  const [imageTab, setImageTab] = useState<'url' | 'upload'>('url');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Alternative images (cap at 3)
  const [altImages, setAltImages] = useState<string[]>([]);
  const [altImageUrlInput, setAltImageUrlInput] = useState('');
  const [isUploadingAlt, setIsUploadingAlt] = useState(false);
  const altFileInputRef = useRef<HTMLInputElement>(null);

  // Product Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isEggless, setIsEggless] = useState(true);
  const [allowEggChoice, setAllowEggChoice] = useState(false);
  const [eggPreferenceDefault, setEggPreferenceDefault] = useState<'EGGLESS' | 'REGULAR'>('EGGLESS');
  const [egglessPriceDiff, setEgglessPriceDiff] = useState('0');
  const [inStock, setInStock] = useState(true);
  const [imageUrl, setImageUrl] = useState(PRESET_IMAGES[0].url);
  const [ingredients, setIngredients] = useState('');
  const [allergens, setAllergens] = useState('');

  // Structured Highlights
  const [highlights, setHighlights] = useState<string[]>([]);
  const [newHighlightInput, setNewHighlightInput] = useState('');

  const [variants, setVariants] = useState<ProductVariant[]>([]);

  // Inline Category Creator inside Product Modal
  const [inlineCatOpen, setInlineCatOpen] = useState(false);
  const [inlineCatName, setInlineCatName] = useState('');
  const [inlineCatLoading, setInlineCatLoading] = useState(false);
  const [inlineCatError, setInlineCatError] = useState<string | null>(null);

  // New variant input fields
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantPrice, setNewVariantPrice] = useState('');
  const [newVariantOriginalPrice, setNewVariantOriginalPrice] = useState('');
  const [newVariantDesc, setNewVariantDesc] = useState('');
  const [newVariantImageUrl, setNewVariantImageUrl] = useState('');

  const fetchProducts = async () => {
    try {
      const data = await productsApi.getOwnerProducts();
      setProducts(data || []);
    } catch {
      setProducts([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await categoriesApi.getOwnerCategories();
      setCategories(data || []);
    } catch {
      setCategories([]);
    }
  };

  const { registerRefreshHandler } = useOwner();

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchProducts(), fetchCategories()]);
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await refreshAll();
      setIsLoading(false);
    };
    init();
  }, [refreshAll]);

  useEffect(() => {
    const unregister = registerRefreshHandler(async () => {
      await refreshAll();
    });
    return unregister;
  }, [registerRefreshHandler, refreshAll]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setDescription('');
    setPrice('');
    setOriginalPrice('');
    setSelectedCategoryId('');
    setInlineCatOpen(false);
    setInlineCatName('');
    setInlineCatError(null);
    setIsEggless(true);
    setAllowEggChoice(false);
    setEggPreferenceDefault('EGGLESS');
    setEgglessPriceDiff('0');
    setInStock(true);
    setImageUrl(PRESET_IMAGES[0].url);
    setImageTab('url');
    setAltImages([]);
    setAltImageUrlInput('');
    setHighlights(['100% Pure Veg', 'Zero Artificial Flavors', 'Baked Fresh Daily']);
    setNewHighlightInput('');
    setIngredients('');
    setAllergens('');
    setVariants([
      { name: '500g', price: 450, isAvailable: true },
      { name: '1 kg', price: 850, isAvailable: true },
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setDescription(p.description || '');
    setIngredients(p.ingredients || '');
    setAllergens(p.allergens || '');
    setPrice(String(p.price));
    setOriginalPrice(p.originalPrice != null ? String(p.originalPrice) : '');
    setSelectedCategoryId(p.categoryId ? String(p.categoryId) : '');
    setInlineCatOpen(false);
    setInlineCatName('');
    setInlineCatError(null);
    setIsEggless(p.isEggless);
    setAllowEggChoice(Boolean(p.allowEggChoice));
    setEggPreferenceDefault(p.eggPreferenceDefault === 'REGULAR' ? 'REGULAR' : 'EGGLESS');
    setEgglessPriceDiff(p.egglessPriceDiff != null ? String(p.egglessPriceDiff) : '0');
    setInStock(p.inStock !== false);
    setImageUrl(p.imageUrl || FALLBACK_CAKE);
    setImageTab('url');

    // Populate alternative images
    if (p.images && p.images.length > 0) {
      setAltImages(p.images.map((img) => img.imageUrl));
    } else {
      setAltImages([]);
    }
    setAltImageUrlInput('');

    // Populate highlights
    if (p.highlights && p.highlights.length > 0) {
      setHighlights(p.highlights.map((h) => h.highlightText));
    } else {
      setHighlights([]);
    }
    setNewHighlightInput('');

    setVariants(p.variants && p.variants.length > 0 ? [...p.variants] : []);
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB');
      return;
    }
    setIsUploading(true);
    try {
      const result = await mediaApi.uploadImage(file, 'products');
      setImageUrl(result.url);
    } catch {
      setImageUrl(URL.createObjectURL(file));
    } finally {
      setIsUploading(false);
    }
  };

  // Alternative images upload / add
  const handleUploadAltImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (altImages.length >= 3) {
      alert('Maximum 3 alternative images allowed.');
      return;
    }
    setIsUploadingAlt(true);
    try {
      const result = await mediaApi.uploadImage(file, 'products');
      setAltImages([...altImages, result.url]);
    } catch (err: any) {
      alert(err?.message || 'Failed to upload photo');
    } finally {
      setIsUploadingAlt(false);
      if (altFileInputRef.current) altFileInputRef.current.value = '';
    }
  };

  const handleAddAltImageUrl = () => {
    if (!altImageUrlInput.trim()) return;
    if (altImages.length >= 3) {
      alert('Maximum 3 alternative images allowed.');
      return;
    }
    setAltImages([...altImages, altImageUrlInput.trim()]);
    setAltImageUrlInput('');
  };

  const handleRemoveAltImage = (index: number) => {
    setAltImages(altImages.filter((_, idx) => idx !== index));
  };

  // Highlights handlers
  const handleAddHighlight = () => {
    const text = newHighlightInput.trim();
    if (!text) return;
    if (highlights.includes(text)) return;
    setHighlights([...highlights, text]);
    setNewHighlightInput('');
  };

  const handleRemoveHighlight = (index: number) => {
    setHighlights(highlights.filter((_, idx) => idx !== index));
  };

  // Variant handlers
  const handleAddPresetVariant = (presetName: string, multiplier: number) => {
    const baseP = Number(price) || 500;
    const calcPrice = Math.round(baseP * multiplier);
    if (!variants.some((v) => v.name.toLowerCase() === presetName.toLowerCase())) {
      setVariants([...variants, { name: presetName, price: calcPrice, isAvailable: true }]);
    }
  };

  const handleAddCustomVariant = () => {
    if (!newVariantName.trim() || !newVariantPrice) return;
    setVariants([
      ...variants,
      {
        name: newVariantName.trim(),
        price: Number(newVariantPrice),
        originalPrice: newVariantOriginalPrice ? Number(newVariantOriginalPrice) : null,
        description: newVariantDesc.trim() || null,
        imageUrl: newVariantImageUrl.trim() || null,
        isAvailable: true,
      },
    ]);
    setNewVariantName('');
    setNewVariantPrice('');
    setNewVariantOriginalPrice('');
    setNewVariantDesc('');
    setNewVariantImageUrl('');
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, idx) => idx !== index));
  };

  const handleQuickCreateCategory = async () => {
    const trimmed = inlineCatName.trim();
    if (!trimmed) {
      setInlineCatError('Category name is required.');
      return;
    }
    setInlineCatLoading(true);
    setInlineCatError(null);
    try {
      const created = await categoriesApi.createCategory({ name: trimmed });
      await fetchCategories();
      setSelectedCategoryId(String(created.id));
      setInlineCatOpen(false);
      setInlineCatName('');
    } catch (err: any) {
      setInlineCatError(err.message || 'Failed to create category.');
    } finally {
      setInlineCatLoading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const baseSellingPrice = Number(price);
    const comparePriceNum = originalPrice ? Number(originalPrice) : null;

    if (comparePriceNum !== null && comparePriceNum <= baseSellingPrice) {
      alert('Original compare-at price must be greater than the selling price to show a discount.');
      setIsSubmitting(false);
      return;
    }

    // Build ProductImage array
    const imagePayload: ProductImage[] = altImages.map((imgUrl, idx) => ({
      imageUrl: imgUrl,
      displayOrder: idx + 1,
      altText: name,
    }));

    // Build ProductHighlight array
    const highlightPayload: ProductHighlight[] = highlights.map((hText, idx) => ({
      highlightText: hText,
      displayOrder: idx + 1,
    }));

    const productPayload: CreateProductRequest = {
      name,
      description,
      ingredients: ingredients.trim() || null,
      allergens: allergens.trim() || null,
      price: baseSellingPrice,
      originalPrice: comparePriceNum,
      categoryId: selectedCategoryId ? Number(selectedCategoryId) : null,
      isEggless,
      allowEggChoice,
      eggPreferenceDefault,
      egglessPriceDiff: allowEggChoice ? Number(egglessPriceDiff) || 0 : 0,
      inStock,
      availability: inStock,
      imageUrl: imageUrl || FALLBACK_CAKE,
      images: imagePayload,
      highlights: highlightPayload,
      variants,
    };

    try {
      if (editingProduct) {
        await productsApi.updateProduct(editingProduct.id, productPayload);
      } else {
        await productsApi.createProduct(productPayload);
      }
      setIsModalOpen(false);
      await refreshAll();
    } catch (err: any) {
      alert(err.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Are you sure you want to delete this cake from your storefront?')) return;
    try {
      await productsApi.deleteProduct(id);
      await refreshAll();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  const handleToggleStock = async (p: Product) => {
    try {
      const updatedStock = !p.inStock;
      await productsApi.updateProduct(p.id, {
        name: p.name,
        description: p.description,
        price: p.price,
        categoryId: p.categoryId,
        isEggless: p.isEggless,
        inStock: updatedStock,
        availability: updatedStock,
        imageUrl: p.imageUrl,
        variants: p.variants,
      });
      setProducts(products.map((item) => (item.id === p.id ? { ...item, inStock: updatedStock } : item)));
    } catch (err: any) {
      alert(err.message || 'Failed to update stock status');
    }
  };

  const uncategorizedCount = useMemo(() => {
    return products.filter((p) => p.categoryId == null).length;
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter check
      if (categoryFilter === 'UNCATEGORIZED') {
        if (p.categoryId != null) return false;
      } else if (categoryFilter !== 'ALL') {
        if (p.categoryId !== Number(categoryFilter)) return false;
      }

      // Search query check
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const catName = p.categoryId
        ? categories.find((c) => c.id === p.categoryId)?.name || p.categoryName || ''
        : 'uncategorized';

      return (
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        catName.toLowerCase().includes(q)
      );
    });
  }, [products, categoryFilter, searchQuery, categories]);

  if (isLoading) return <LoadingState message="Loading bakery catalog & categories..." />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif font-bold text-2xl text-owner-heading">Product Catalog</h1>
          <p className="text-xs text-owner-muted mt-0.5">
            Manage your artisanal celebration cakes, size variants, custom categories, and live availability
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCategoryModalOpen(true)}
            className="text-xs border-owner-border text-brand-espresso hover:bg-brand-cream-light"
          >
            <Tag className="w-3.5 h-3.5 mr-1.5 text-brand-plum" />
            <span>Categories ({categories.length})</span>
          </Button>
          <Button onClick={openCreateModal} size="sm" className="shadow-2xs text-xs">
            <Plus className="w-4 h-4 mr-1.5" /> Add Cake
          </Button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      {products.length > 0 && (
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-owner-muted" />
            <input
              type="text"
              placeholder="Search cakes by name, description, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-owner-border bg-white text-owner-heading placeholder:text-owner-muted focus:outline-none focus:ring-2 focus:ring-brand-plum/20 focus:border-brand-plum"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setCategoryFilter('ALL')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                categoryFilter === 'ALL'
                  ? 'bg-brand-plum text-white shadow-2xs'
                  : 'bg-white text-owner-muted border border-owner-border hover:text-owner-heading hover:bg-owner-canvas'
              }`}
            >
              All ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('UNCATEGORIZED')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                categoryFilter === 'UNCATEGORIZED'
                  ? 'bg-brand-plum text-white shadow-2xs'
                  : 'bg-white text-owner-muted border border-owner-border hover:text-owner-heading hover:bg-owner-canvas'
              }`}
            >
              Uncategorized ({uncategorizedCount})
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryFilter(String(c.id))}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  categoryFilter === String(c.id)
                    ? 'bg-brand-plum text-white shadow-2xs'
                    : 'bg-white text-owner-muted border border-owner-border hover:text-owner-heading hover:bg-owner-canvas'
                }`}
              >
                {c.name} ({c.productCount ?? 0})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products Table */}
      {products.length === 0 ? (
        <EmptyState
          icon={<Cake className="w-6 h-6" />}
          title="No Cakes in Catalog"
          description="Add your first artisanal creation to start accepting orders from customers."
          action={
            <Button onClick={openCreateModal} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add First Cake
            </Button>
          }
        />
      ) : filteredProducts.length === 0 ? (
        <div className="py-12 text-center text-xs text-owner-muted bg-white rounded-2xl border border-owner-border">
          No cakes match the selected filter or search query.
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-owner-border bg-owner-canvas/40 text-owner-muted">
                  <th className="py-3 px-4">Cake & Gallery</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Dietary</th>
                  <th className="py-3 px-4">Pricing</th>
                  <th className="py-3 px-4">Availability</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-owner-border">
                {filteredProducts.map((p) => {
                  const cat = p.categoryId ? categories.find((c) => c.id === p.categoryId) : null;
                  const catDisplayName = cat?.name || p.categoryName;
                  const discountPercent =
                    p.originalPrice && p.originalPrice > p.price
                      ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                      : null;

                  return (
                    <tr key={p.id} className="hover:bg-owner-canvas/30 transition-colors">
                      {/* Cake Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-brand-cream border border-owner-border/80 shrink-0">
                            <img
                              src={p.imageUrl || FALLBACK_CAKE}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                            {p.images && p.images.length > 0 && (
                              <span className="absolute bottom-0 right-0 bg-brand-plum text-white text-[9px] font-bold px-1 rounded-tl">
                                +{p.images.length}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-owner-heading truncate">{p.name}</p>
                            <p className="text-[11px] text-owner-muted line-clamp-1 max-w-xs">
                              {p.description || 'Handcrafted creation'}
                            </p>

                            {/* Highlights chips */}
                            {p.highlights && p.highlights.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {p.highlights.slice(0, 2).map((h, i) => (
                                  <span
                                    key={i}
                                    className="text-[9px] px-1.5 py-0.2 rounded bg-brand-blush/40 text-brand-plum font-medium"
                                  >
                                    ★ {h.highlightText}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category Column */}
                      <td className="py-3.5 px-4">
                        {p.categoryId != null ? (
                          <span className="font-semibold text-brand-espresso text-xs">
                            {catDisplayName || 'Categorized'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-brand-cream border border-brand-border text-brand-muted">
                            Uncategorized
                          </span>
                        )}
                      </td>

                      {/* Dietary Column */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <Badge variant={p.isEggless ? 'success' : 'default'} size="sm">
                            {p.isEggless ? '🌱 Eggless' : 'Contains Egg'}
                          </Badge>
                          {p.allowEggChoice && (
                            <span className="text-[10px] block text-brand-muted font-medium">
                              Choice Allowed (Default: {p.eggPreferenceDefault || 'EGGLESS'})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Pricing Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold text-owner-heading">₹{p.price}</span>
                          {p.originalPrice && p.originalPrice > p.price && (
                            <span className="line-through text-owner-muted text-[11px]">
                              ₹{p.originalPrice}
                            </span>
                          )}
                          {discountPercent && (
                            <span className="text-[10px] font-bold text-emerald-600">
                              {discountPercent}% off
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stock Status Column */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStock(p)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                            p.inStock !== false
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                          title="Click to toggle stock"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${p.inStock !== false ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                          {p.inStock !== false ? 'In Stock' : 'Sold Out'}
                        </button>
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 text-owner-muted hover:text-brand-plum hover:bg-brand-blush/40 rounded-lg transition-colors cursor-pointer"
                            title="Edit Cake"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-1.5 text-owner-muted hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Cake"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add / Edit Cake Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Cake Details' : 'Add New Cake to Storefront'}
      >
        <form onSubmit={handleSaveProduct} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <Input
            label="Cake Name"
            required
            placeholder="e.g. Belgian Dark Truffle"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Description / Flavor Notes"
            placeholder="Layered rich dark chocolate sponge with 54% Belgian ganache"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Ingredients */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-brand-espresso">
                Ingredients <span className="text-xs text-brand-muted font-normal">(Optional)</span>
              </label>
              <span className="text-[11px] text-brand-muted">{ingredients.length}/1000</span>
            </div>
            <textarea
              rows={3}
              maxLength={1000}
              placeholder="Enter the ingredients used in this cake (e.g. Dutch cocoa powder, Belgian couverture chocolate, fresh dairy cream, organic wheat flour)..."
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-brand-border text-brand-espresso text-sm placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-plum/20 focus:border-brand-plum transition-all resize-none"
            />
          </div>

          {/* Allergen Information */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-brand-espresso">
                Allergen Information <span className="text-xs text-brand-muted font-normal">(Optional)</span>
              </label>
              <span className="text-[11px] text-brand-muted">{allergens.length}/500</span>
            </div>
            <textarea
              rows={2}
              maxLength={500}
              placeholder="Example: Contains dairy, gluten, nuts..."
              value={allergens}
              onChange={(e) => setAllergens(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-brand-border text-brand-espresso text-sm placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-plum/20 focus:border-brand-plum transition-all resize-none"
            />
          </div>

          {/* Pricing & Compare-at Price */}
          <div className="p-4 rounded-2xl bg-owner-canvas/60 border border-owner-border space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-owner-heading">
              <Percent className="w-3.5 h-3.5 text-brand-plum" />
              <span>Pricing & Discount</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Selling Price (₹) *"
                type="number"
                required
                min="1"
                placeholder="850"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                helperText="Actual price charged to customer."
              />

              <Input
                label="Original Price / Compare-At (₹)"
                type="number"
                min="0"
                placeholder="e.g. 1000 (Optional)"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                helperText="Shows strikethrough badge (e.g. 15% OFF)."
              />
            </div>
          </div>

          {/* Dynamic Category Selector + Quick Add */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-brand-espresso">Category</label>
              {!inlineCatOpen && (
                <button
                  type="button"
                  onClick={() => {
                    setInlineCatOpen(true);
                    setInlineCatError(null);
                  }}
                  className="text-xs font-semibold text-brand-plum hover:text-brand-plum-dark flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> New Category
                </button>
              )}
            </div>

            {!inlineCatOpen ? (
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-brand-border text-brand-espresso text-sm focus:outline-none focus:ring-2 focus:ring-brand-plum/20 focus:border-brand-plum"
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 rounded-xl bg-brand-cream-light/80 border border-brand-border space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-brand-espresso font-serif">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-brand-plum" /> Quick Add Category
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setInlineCatOpen(false);
                      setInlineCatName('');
                      setInlineCatError(null);
                    }}
                    className="text-brand-muted hover:text-brand-espresso"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Birthday Cakes"
                    value={inlineCatName}
                    onChange={(e) => setInlineCatName(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-brand-border bg-white text-brand-espresso focus:outline-none focus:ring-1 focus:ring-brand-plum"
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    isLoading={inlineCatLoading}
                    onClick={handleQuickCreateCategory}
                    className="text-xs shrink-0"
                  >
                    Add
                  </Button>
                </div>
                {inlineCatError && (
                  <p className="text-[11px] text-red-600 font-medium">{inlineCatError}</p>
                )}
              </div>
            )}
          </div>

          {/* Egg Preference Section */}
          <div className="p-4 rounded-2xl bg-brand-cream-light/60 border border-brand-border/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-owner-heading">
                <Egg className="w-3.5 h-3.5 text-brand-plum" />
                <span>Egg & Dietary Preference</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-brand-espresso">
                <input
                  type="checkbox"
                  checked={allowEggChoice}
                  onChange={(e) => setAllowEggChoice(e.target.checked)}
                  className="rounded text-brand-plum focus:ring-brand-plum"
                />
                <span>Allow Customer to Choose</span>
              </label>
            </div>

            {!allowEggChoice ? (
              <label className="flex items-center gap-2 text-xs text-owner-heading font-medium cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isEggless}
                  onChange={(e) => setIsEggless(e.target.checked)}
                  className="rounded text-brand-plum focus:ring-brand-plum"
                />
                <span>🌱 100% Pure Eggless Cake (Fixed)</span>
              </label>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-owner-heading block">Default Preference</label>
                  <select
                    value={eggPreferenceDefault}
                    onChange={(e) => setEggPreferenceDefault(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border rounded-xl bg-white border-brand-border focus:outline-none focus:ring-1 focus:ring-brand-plum"
                  >
                    <option value="EGGLESS">🌱 Eggless by default</option>
                    <option value="REGULAR">🥚 With Egg by default</option>
                  </select>
                </div>

                <Input
                  label="Eggless Price Difference (₹)"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={egglessPriceDiff}
                  onChange={(e) => setEgglessPriceDiff(e.target.value)}
                  helperText="Extra charged when customer chooses eggless."
                />
              </div>
            )}
          </div>

          {/* Product Highlights Section */}
          <div className="p-4 rounded-2xl bg-owner-canvas/60 border border-owner-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-owner-heading">
                <Award className="w-3.5 h-3.5 text-brand-plum" />
                <span>Product Highlights Badges</span>
              </div>
              <span className="text-[10px] text-owner-muted">Shown prominently on product page</span>
            </div>

            {/* List of badges */}
            {highlights.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {highlights.map((h, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-owner-border text-owner-heading text-xs font-medium shadow-2xs"
                  >
                    <span>★ {h}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveHighlight(idx)}
                      className="text-owner-muted hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add highlight input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. 100% Pure Butter, Zero Preservatives, No Gelatin"
                value={newHighlightInput}
                onChange={(e) => setNewHighlightInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddHighlight();
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-owner-border bg-white text-owner-heading focus:outline-none focus:ring-1 focus:ring-brand-plum"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddHighlight}>
                Add Badge
              </Button>
            </div>
          </div>

          {/* Cake Main Photo Section */}
          <div className="space-y-3 pt-1">
            <label className="text-xs font-bold text-owner-heading block">Main Product Photo *</label>
            <div className="flex gap-1 p-1 bg-owner-canvas rounded-xl border border-owner-border">
              <button
                type="button"
                onClick={() => setImageTab('url')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  imageTab === 'url' ? 'bg-white text-owner-heading shadow-sm' : 'text-owner-muted'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" /> Paste URL
              </button>
              <button
                type="button"
                onClick={() => setImageTab('upload')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  imageTab === 'upload' ? 'bg-white text-owner-heading shadow-sm' : 'text-owner-muted'
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> Upload File
              </button>
            </div>

            {imageTab === 'url' ? (
              <div className="space-y-2">
                <Input
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[11px] text-owner-muted font-medium">Presets:</span>
                  {PRESET_IMAGES.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setImageUrl(preset.url)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                        imageUrl === preset.url
                          ? 'bg-brand-plum text-white border-brand-plum'
                          : 'bg-owner-canvas text-owner-heading border-owner-border hover:bg-brand-blush/50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-owner-border rounded-2xl p-6 text-center hover:border-brand-plum/50 hover:bg-brand-blush/10 transition-all cursor-pointer"
                >
                  {isUploading ? (
                    <div className="flex items-center justify-center gap-2 text-xs text-owner-muted">
                      <div className="w-4 h-4 border-2 border-brand-plum border-t-transparent rounded-full animate-spin" />
                      Uploading photo...
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-owner-muted mx-auto mb-2" />
                      <p className="text-xs font-semibold text-owner-heading">Click to upload main cake photo</p>
                      <p className="text-[11px] text-owner-muted mt-1">JPG, PNG, WebP up to 5MB</p>
                    </>
                  )}
                </button>
              </div>
            )}

            {imageUrl && (
              <div className="flex items-center gap-3 p-2 rounded-xl bg-owner-canvas border border-owner-border">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-brand-cream border shrink-0">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <span className="text-xs text-owner-muted">Main photo selected</span>
              </div>
            )}
          </div>

          {/* Alternative Images (Cap at 3) */}
          <div className="p-4 rounded-2xl bg-owner-canvas/60 border border-owner-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-owner-heading">
                <ImageIcon className="w-3.5 h-3.5 text-brand-plum" />
                <span>Alternative Gallery Images ({altImages.length}/3)</span>
              </div>
              <span className="text-[10px] text-owner-muted">Up to 3 additional photos</span>
            </div>

            {/* Existing alt images preview */}
            {altImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {altImages.map((img, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-brand-border h-24 bg-white">
                    <img src={img} alt={`Alt ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveAltImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-lg opacity-80 hover:opacity-100 transition-opacity"
                      title="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add alternative image controls */}
            {altImages.length < 3 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Paste image URL..."
                    value={altImageUrlInput}
                    onChange={(e) => setAltImageUrlInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-owner-border bg-white text-owner-heading focus:outline-none focus:ring-1 focus:ring-brand-plum"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddAltImageUrl}>
                    Add URL
                  </Button>
                  <input
                    ref={altFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadAltImage}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => altFileInputRef.current?.click()}
                    isLoading={isUploadingAlt}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" /> Upload
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Flavour & Size Variants Section */}
          <div className="p-4 rounded-2xl bg-owner-canvas/60 border border-owner-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-owner-heading">
                <Layers className="w-3.5 h-3.5 text-brand-plum" />
                <span>Sizes & Flavours Variants</span>
              </div>
              <span className="text-[10px] text-owner-muted">Individual prices & photos</span>
            </div>

            {/* Quick Add Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-owner-muted font-medium">Quick Add Weight:</span>
              {WEIGHT_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleAddPresetVariant(p.label, p.defaultMultiplier)}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white border border-owner-border text-brand-espresso hover:border-brand-plum hover:bg-brand-blush/30 transition-colors cursor-pointer"
                >
                  + {p.label}
                </button>
              ))}
            </div>

            {/* Existing Variants List */}
            {variants.length > 0 && (
              <div className="space-y-2 pt-1">
                {variants.map((v, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 p-2.5 bg-white rounded-xl border border-owner-border text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {v.imageUrl && (
                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-brand-border">
                          <img src={v.imageUrl} alt={v.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="font-semibold text-owner-heading block truncate">{v.name}</span>
                        {v.description && (
                          <span className="text-[10px] text-owner-muted truncate block">{v.description}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-brand-plum font-bold">₹{v.price}</span>
                      {v.originalPrice && (
                        <span className="line-through text-owner-muted text-[10px]">
                          ₹{v.originalPrice}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(idx)}
                        className="text-owner-muted hover:text-red-600 p-1 transition-colors cursor-pointer"
                        title="Remove variant"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Custom Variant Form */}
            <div className="space-y-2 pt-1 border-t border-brand-border/40">
              <span className="text-[11px] font-bold text-owner-heading block">Add Custom Variant / Flavour:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Variant Name (e.g. Dutch Truffle 1kg)"
                  value={newVariantName}
                  onChange={(e) => setNewVariantName(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-owner-border bg-white text-owner-heading focus:outline-none focus:ring-1 focus:ring-brand-plum"
                />
                <input
                  type="number"
                  placeholder="Selling Price (₹)"
                  value={newVariantPrice}
                  onChange={(e) => setNewVariantPrice(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-owner-border bg-white text-owner-heading focus:outline-none focus:ring-1 focus:ring-brand-plum"
                />
                <input
                  type="number"
                  placeholder="Compare Price (₹)"
                  value={newVariantOriginalPrice}
                  onChange={(e) => setNewVariantOriginalPrice(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-owner-border bg-white text-owner-heading focus:outline-none focus:ring-1 focus:ring-brand-plum"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Optional variant image URL..."
                  value={newVariantImageUrl}
                  onChange={(e) => setNewVariantImageUrl(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-owner-border bg-white text-owner-heading focus:outline-none focus:ring-1 focus:ring-brand-plum"
                />
                <input
                  type="text"
                  placeholder="Short note..."
                  value={newVariantDesc}
                  onChange={(e) => setNewVariantDesc(e.target.value)}
                  className="w-1/3 px-3 py-1.5 text-xs rounded-xl border border-owner-border bg-white text-owner-heading focus:outline-none focus:ring-1 focus:ring-brand-plum"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomVariant}
                  className="text-xs shrink-0"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Live Availability Status */}
          <div className="pt-2 border-t border-owner-border/70">
            <label className="flex items-center gap-2 text-xs text-owner-heading font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
                className="rounded text-brand-plum focus:ring-brand-plum"
              />
              <span>In Stock & Live on Storefront</span>
            </label>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 flex justify-end gap-3 border-t border-owner-border">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingProduct ? 'Save Changes' : 'Publish Cake'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onCategoriesChanged={refreshAll}
      />
    </div>
  );
}
