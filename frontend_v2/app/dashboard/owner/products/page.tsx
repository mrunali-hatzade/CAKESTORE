'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState, useRef, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Copy,
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
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { CategoryManagerModal } from '@/components/owner/CategoryManagerModal';
import { ProductModal } from '@/components/owner/ProductModal';
import { useToast } from '@/components/common/Toast';

const FALLBACK_CAKE =
  'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=400&q=80';



function OwnerProductsContent() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Delete Modal State
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const itemsPerPage = 20;

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);

  // Example Seeding
  const [isSeeding, setIsSeeding] = useState(false);
  const handleSeedProductExample = async () => {
    setIsSeeding(true);
    try {
      await productsApi.createProduct({
        name: 'Artisan Truffle Cake (Example)',
        description: 'A rich, multi-layered chocolate truffle cake. This is an example product visible only to you.',
        ingredients: 'Premium Belgian Chocolate, Fresh Cream, Flour, Sugar, Butter, Cocoa Powder, Madagascar Vanilla',
        allergens: 'Contains Dairy, Gluten. May contain traces of Nuts.',
        price: 650,
        originalPrice: 800,
        isEggless: true,
        allowEggChoice: true,
        eggPreferenceDefault: 'EGGLESS',
        egglessPriceDiff: 50,
        preparationTimeHours: 24,
        weightGrams: 500,
          availability: false,
        imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
        images: [
          { imageUrl: 'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?auto=format&fit=crop&w=800&q=80', displayOrder: 1, altText: 'Side angle view' }
        ],
        variants: [
          { name: '1/2 Kg', price: 650, originalPrice: 800, description: 'Serves 4-6 people', imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=400&q=80' },
          { name: '1 Kg', price: 1200, originalPrice: 1400, description: 'Serves 10-12 people', imageUrl: 'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?auto=format&fit=crop&w=400&q=80' }
        ],
        highlights: [
          { highlightText: '100% Pure Veg', displayOrder: 1 },
          { highlightText: 'Zero Artificial Colors', displayOrder: 2 }
        ],
        addons: [
          { name: 'Sparkle Candles (Pack of 4)', price: 49 },
          { name: 'Happy Birthday Topper', price: 99 }
        ]
      });
      toast.success('Example cake generated successfully!');
      await refreshAll();
    } catch (err: any) {
      toast.error('Failed to generate example: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSeeding(false);
    }
  };

  const fetchProducts = useCallback(async () => {
    try {
      const catId = categoryFilter === 'UNCATEGORIZED' ? -1 : (categoryFilter !== 'ALL' ? categoryFilter : undefined);
      const data = await productsApi.getOwnerProducts(currentPage, itemsPerPage, searchQuery || undefined, catId);
      setProducts(data?.content || []);
      setTotalPages(data?.totalPages || 1);
      setTotalProducts(data?.totalElements || 0);
    } catch (err: any) {
      setProducts([]);
      setTotalPages(1);
      setTotalProducts(0);
      toast.error('Failed to load products: ' + (err.message || 'Unknown error'));
    }
  }, [currentPage, searchQuery, categoryFilter, toast]);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await categoriesApi.getOwnerCategories();
      setCategories(data || []);
    } catch {
      setCategories([]);
    }
  }, []);

  const { registerRefreshHandler } = useOwner();

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchProducts(), fetchCategories()]);
  }, [fetchProducts, fetchCategories]);

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

  // Deep-linking from Global Search or external links
  useEffect(() => {
    if (!searchParams) return;
    const s = searchParams.get('search');
    const pId = searchParams.get('productId');
    if (s) setSearchQuery(s);
    if (pId && products.length > 0) {
      const match = products.find((p) => String(p.id) === String(pId));
      if (match) openEditModal(match);
    }
  }, [searchParams, products]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setIsDuplicate(false);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setIsDuplicate(false);
    setIsModalOpen(true);
  };

  const handleDuplicateProduct = (p: Product) => {
    setEditingProduct(p);
    setIsDuplicate(true);
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (id: number) => {
    setIsDeleting(true);
    try {
      await productsApi.deleteProduct(id);
      await refreshAll();
      toast.success('Cake removed from catalog');
      setDeleteConfirmId(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete product');
    } finally {
      setIsDeleting(false);
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
      toast.success(updatedStock ? 'Marked as In Stock' : 'Marked as Sold Out');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update stock status');
    }
  };

  // Reset to page 0 when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, categoryFilter]);

  // Filtering is now done server-side
  const filteredProducts = products;

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
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button onClick={handleSeedProductExample} isLoading={isSeeding} size="sm" variant="outline" className="text-brand-plum border-brand-plum/30 hover:bg-brand-cream hidden sm:flex">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Generate Example
          </Button>
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
              All
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
              Uncategorized
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
                              className={`w-full h-full object-cover ${p.inStock === false ? 'grayscale opacity-50' : ''}`}
                            />
                            {p.inStock === false && (
                              <div className="absolute inset-0 bg-red-900/20 flex items-center justify-center backdrop-blur-[1px]">
                                <X className="w-4 h-4 text-white drop-shadow" />
                              </div>
                            )}
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
                          {p.variants && p.variants.length > 0 ? (
                            <div className="space-y-0.5">
                              <span className="font-bold text-owner-heading">
                                ₹{Math.min(...p.variants.map((v) => Number(v.price)))} – ₹{Math.max(...p.variants.map((v) => Number(v.price)))}
                              </span>
                              <span className="block text-[10px] text-brand-plum font-semibold">
                                {p.variants.length} Sizes
                              </span>
                            </div>
                          ) : (
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
                            onClick={() => handleDuplicateProduct(p)}
                            className="p-1.5 text-owner-muted hover:text-brand-plum hover:bg-brand-blush/40 rounded-lg transition-colors cursor-pointer"
                            title="Duplicate Cake"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(p.id)}
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t border-owner-border bg-white rounded-xl shadow-sm mt-4">
          <span className="text-xs text-owner-muted">
            Page {currentPage + 1} of {totalPages} ({totalProducts} total cakes)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="text-xs"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add / Edit Cake Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingProduct={editingProduct}
        categories={categories}
        onSaveSuccess={refreshAll}
        isDuplicate={isDuplicate}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmId !== null && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirmId(null)}
          title="Delete Product?"
        >
          <div className="space-y-4 pt-2">
            <p className="text-xs text-owner-muted leading-relaxed">
              Are you sure you want to remove this cake from your storefront catalog? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-owner-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDeleteProduct(deleteConfirmId)}
                disabled={isDeleting}
                className="text-xs font-bold"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

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

export default function OwnerProductsPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading artisanal cake catalog..." />}>
      <OwnerProductsContent />
    </Suspense>
  );
}

