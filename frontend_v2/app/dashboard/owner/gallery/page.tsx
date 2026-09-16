'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Images,
  Plus,
  Trash2,
  Edit2,
  Search,
  X,
  Upload,
  Sparkles,
  ExternalLink,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
} from 'lucide-react';
import { galleryApi } from '@/lib/api/gallery';
import { mediaApi } from '@/lib/api/media';
import { useOwner } from '@/context/OwnerContext';
import { GalleryItem, CreateGalleryItemRequest } from '@/types/gallery';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';

const PRESET_GALLERY_PHOTOS = [
  {
    label: 'Floral Wedding Tier',
    url: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=800&q=80',
    category: 'Wedding',
  },
  {
    label: 'Royal Chocolate Drip',
    url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
    category: 'Birthday',
  },
  {
    label: 'Red Velvet Elegance',
    url: 'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?auto=format&fit=crop&w=800&q=80',
    category: 'Anniversary',
  },
  {
    label: '3D Fondant Sculpted',
    url: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80',
    category: '3D Sculpted',
  },
  {
    label: 'Artisanal Cupcake Tower',
    url: 'https://images.unsplash.com/photo-1587668178277-295251f900ce?auto=format&fit=crop&w=800&q=80',
    category: 'Bespoke',
  },
];

const STANDARD_CATEGORIES = [
  'Wedding',
  'Birthday',
  'Anniversary',
  '3D Sculpted',
  'Bespoke',
  'Baby Shower',
  'Festive',
  'Pastry',
];

export default function OwnerGalleryPage() {
  const { shop, registerRefreshHandler } = useOwner();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [categoryName, setCategoryName] = useState('Wedding');
  const [customCategory, setCustomCategory] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [imageUrl, setImageUrl] = useState(PRESET_GALLERY_PHOTOS[0].url);

  // Image tab & upload
  const [imageTab, setImageTab] = useState<'presets' | 'upload' | 'url'>('presets');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchGalleryItems = useCallback(async () => {
    try {
      const data = await galleryApi.getOwnerGalleryItems();
      setItems(data || []);
    } catch (err: any) {
      console.error('Failed to load gallery items:', err);
      setItems([]);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await fetchGalleryItems();
      setIsLoading(false);
    };
    init();
  }, [fetchGalleryItems]);

  useEffect(() => {
    const unregister = registerRefreshHandler(async () => {
      await fetchGalleryItems();
    });
    return unregister;
  }, [registerRefreshHandler, fetchGalleryItems]);

  const openAddModal = () => {
    setEditingItem(null);
    setTitle('');
    setCaption('');
    setCategoryName('Wedding');
    setCustomCategory('');
    setDisplayOrder(String(items.length));
    setIsActive(true);
    setImageUrl(PRESET_GALLERY_PHOTOS[0].url);
    setImageTab('presets');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: GalleryItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setCaption(item.caption || '');
    if (STANDARD_CATEGORIES.includes(item.categoryName)) {
      setCategoryName(item.categoryName);
      setCustomCategory('');
    } else {
      setCategoryName('CUSTOM');
      setCustomCategory(item.categoryName || '');
    }
    setDisplayOrder(String(item.displayOrder ?? 0));
    setIsActive(item.isActive);
    setImageUrl(item.imageUrl);
    setImageTab('url');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be under 5MB');
      return;
    }
    setIsUploading(true);
    try {
      const res = await mediaApi.uploadImage(file, 'products');
      setImageUrl(res.url);
    } catch (err: any) {
      alert(err.message || 'Image upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Please provide a title for this showcase cake.');
      return;
    }
    if (!imageUrl.trim()) {
      setErrorMessage('Please upload or select an image for this showcase cake.');
      return;
    }

    const finalCategory =
      categoryName === 'CUSTOM'
        ? customCategory.trim() || 'Bespoke'
        : categoryName;

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload: CreateGalleryItemRequest = {
      title: title.trim(),
      caption: caption.trim() || undefined,
      imageUrl: imageUrl.trim(),
      categoryName: finalCategory,
      displayOrder: parseInt(displayOrder, 10) || 0,
      isActive,
    };

    try {
      if (editingItem) {
        await galleryApi.updateGalleryItem(editingItem.id, payload);
      } else {
        await galleryApi.createGalleryItem(payload);
      }
      await fetchGalleryItems();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Gallery save error:', err);
      const msg =
        err?.name === 'TimeoutError' || err?.message?.includes('timeout')
          ? 'Request timed out. Please check the server is running and try again.'
          : err.message || 'Failed to save showcase photo. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setIsDeleting(true);
    try {
      await galleryApi.deleteGalleryItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setDeleteConfirmId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete gallery item.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (item: GalleryItem) => {
    try {
      const updated = await galleryApi.updateGalleryItem(item.id, {
        title: item.title,
        caption: item.caption,
        imageUrl: item.imageUrl,
        categoryName: item.categoryName,
        displayOrder: item.displayOrder,
        isActive: !item.isActive,
      });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch (err: any) {
      alert(err.message || 'Failed to update visibility.');
    }
  };

  // Extract all categories available in the gallery
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    STANDARD_CATEGORIES.forEach((c) => set.add(c));
    items.forEach((i) => {
      if (i.categoryName) set.add(i.categoryName);
    });
    return Array.from(set);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.caption && item.caption.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.categoryName && item.categoryName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategoryFilter === 'ALL' ||
        (item.categoryName && item.categoryName.toLowerCase() === selectedCategoryFilter.toLowerCase());

      return matchesSearch && matchesCat;
    });
  }, [items, searchQuery, selectedCategoryFilter]);

  const activeCount = items.filter((i) => i.isActive).length;

  if (isLoading) {
    return <LoadingState message="Loading your bakery gallery showcase..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-owner-border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-blush text-brand-plum">
              <Images className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-owner-heading">
              Cake Gallery Showcase
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-owner-muted max-w-2xl">
            Upload and organize bespoke portfolio creations, wedding showpieces, and custom cake masterpieces.
            These appear on your public storefront gallery tab alongside your active menu.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {shop?.id && (
            <Link
              href={`/shop/${shop.id}?tab=gallery`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-1.5 shadow-2xs">
                <Eye className="w-4 h-4 text-brand-plum" />
                <span className="hidden md:inline">View Public Gallery</span>
                <ExternalLink className="w-3 h-3 text-owner-muted" />
              </Button>
            </Link>
          )}
          <Button onClick={openAddModal} className="gap-2 shadow-sm font-semibold">
            <Plus className="w-4 h-4" />
            <span>Add Showcase Photo</span>
          </Button>
        </div>
      </div>

      {/* Filter and Stats Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-owner-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search gallery by title, theme, or category..."
            className="pl-9 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-owner-muted hover:text-owner-heading"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Counter Pill */}
        <div className="flex items-center gap-2 text-xs text-owner-muted font-medium">
          <span className="px-2.5 py-1 rounded-full bg-owner-canvas border border-owner-border">
            Total Photos: <strong className="text-owner-heading">{items.length}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
            Live on Store: <strong>{activeCount}</strong>
          </span>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <button
          onClick={() => setSelectedCategoryFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-all shrink-0 cursor-pointer ${
            selectedCategoryFilter === 'ALL'
              ? 'bg-brand-plum text-white shadow-xs'
              : 'bg-white text-owner-heading border border-owner-border hover:bg-brand-cream/60'
          }`}
        >
          All Categories ({items.length})
        </button>
        {allCategories.map((cat) => {
          const count = items.filter(
            (i) => i.categoryName && i.categoryName.toLowerCase() === cat.toLowerCase()
          ).length;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all shrink-0 cursor-pointer ${
                selectedCategoryFilter.toLowerCase() === cat.toLowerCase()
                  ? 'bg-brand-plum text-white shadow-xs'
                  : 'bg-white text-owner-heading border border-owner-border hover:bg-brand-cream/60'
              }`}
            >
              {cat} {count > 0 ? `(${count})` : ''}
            </button>
          );
        })}
      </div>

      {/* Gallery Items Grid */}
      {filteredItems.length === 0 ? (
        items.length === 0 ? (
          <EmptyState
            icon={<Images className="w-7 h-7" />}
            title="Your Gallery Showcase is Empty"
            description="Upload photos of your finest wedding cakes, fondant birthday designs, and bespoke orders to impress customers visiting your storefront."
            action={
              <Button onClick={openAddModal} className="text-xs font-semibold gap-1.5">
                <Plus className="w-4 h-4" />
                <span>Add First Showcase Photo</span>
              </Button>
            }
          />
        ) : (
          <div className="p-12 text-center bg-white rounded-2xl border border-owner-border">
            <p className="text-sm text-owner-muted">
              No showcase photos match &ldquo;{searchQuery || selectedCategoryFilter}&rdquo;.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategoryFilter('ALL');
              }}
              className="mt-3 text-xs"
            >
              Clear Filters
            </Button>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className="group overflow-hidden flex flex-col justify-between border-owner-border hover:shadow-elevated transition-all duration-300"
            >
              {/* Image & Badges */}
              <div className="relative aspect-square w-full bg-owner-canvas overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Category Badge */}
                <div className="absolute top-2.5 left-2.5">
                  <Badge variant="plum" className="bg-white/95 text-brand-plum backdrop-blur-xs shadow-xs text-[10px] font-bold">
                    {item.categoryName || 'Bespoke'}
                  </Badge>
                </div>

                {/* Visibility Status Badge */}
                <div className="absolute top-2.5 right-2.5">
                  <button
                    onClick={() => handleToggleActive(item)}
                    title={item.isActive ? 'Visible in public gallery (click to hide)' : 'Hidden from public gallery (click to show)'}
                    className={`px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs transition-colors backdrop-blur-xs cursor-pointer ${
                      item.isActive
                        ? 'bg-emerald-500/90 text-white hover:bg-emerald-600'
                        : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-900'
                    }`}
                  >
                    {item.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    <span>{item.isActive ? 'Active' : 'Hidden'}</span>
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-owner-heading line-clamp-1 group-hover:text-brand-plum transition-colors">
                    {item.title}
                  </h3>
                  {item.caption ? (
                    <p className="text-xs text-owner-muted line-clamp-2 leading-relaxed">
                      {item.caption}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">No caption provided</p>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-owner-border/70 flex items-center justify-between">
                  <span className="text-[11px] text-owner-muted font-medium">
                    Order #{item.displayOrder ?? 0}
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(item)}
                      className="p-1.5 h-auto text-owner-muted hover:text-brand-plum rounded-lg"
                      title="Edit photo details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmId(item.id)}
                      className="p-1.5 h-auto text-owner-muted hover:text-rose-600 rounded-lg"
                      title="Delete photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Showcase Photo' : 'Add Portfolio Showcase Photo'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Photo Source Tabs */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-owner-heading block">
              Showcase Photo <span className="text-rose-500">*</span>
            </label>
            <div className="flex rounded-xl bg-owner-canvas p-1 border border-owner-border text-xs font-semibold">
              <button
                type="button"
                onClick={() => setImageTab('presets')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  imageTab === 'presets' ? 'bg-white shadow-xs text-brand-plum font-bold' : 'text-owner-muted'
                }`}
              >
                Presets
              </button>
              <button
                type="button"
                onClick={() => setImageTab('upload')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  imageTab === 'upload' ? 'bg-white shadow-xs text-brand-plum font-bold' : 'text-owner-muted'
                }`}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setImageTab('url')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  imageTab === 'url' ? 'bg-white shadow-xs text-brand-plum font-bold' : 'text-owner-muted'
                }`}
              >
                Paste URL
              </button>
            </div>

            {/* Presets Option */}
            {imageTab === 'presets' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {PRESET_GALLERY_PHOTOS.map((preset) => {
                  const isSelected = imageUrl === preset.url;
                  return (
                    <button
                      type="button"
                      key={preset.label}
                      onClick={() => {
                        setImageUrl(preset.url);
                        if (!title) setTitle(preset.label.replace(/^[^\s]+\s/, ''));
                        setCategoryName(preset.category);
                      }}
                      className={`relative rounded-xl overflow-hidden border p-1 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-brand-plum ring-2 ring-brand-plum/20 bg-brand-blush/20'
                          : 'border-owner-border hover:border-brand-muted/50'
                      }`}
                    >
                      <div className="aspect-video rounded-lg overflow-hidden bg-owner-canvas">
                        <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                      </div>
                      <span className="block text-[11px] font-semibold text-owner-heading mt-1 truncate">
                        {preset.label}
                      </span>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-brand-plum text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Upload Option */}
            {imageTab === 'upload' && (
              <div className="pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-owner-border hover:border-brand-plum rounded-2xl p-6 text-center cursor-pointer bg-owner-canvas hover:bg-brand-cream/30 transition-all"
                >
                  <Upload className="w-8 h-8 text-brand-plum mx-auto mb-2" />
                  <p className="text-xs font-semibold text-owner-heading">
                    {isUploading ? 'Uploading to bakery media server...' : 'Click to select photo from device'}
                  </p>
                  <p className="text-[10px] text-owner-muted mt-1">
                    Supports JPG, PNG, WEBP up to 5MB
                  </p>
                </div>
              </div>
            )}

            {/* URL Option */}
            {imageTab === 'url' && (
              <div className="pt-1 space-y-2">
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="text-xs"
                />
              </div>
            )}

            {/* Current Selected Image Preview */}
            {imageUrl && (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-owner-canvas border border-owner-border mt-2">
                <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-white border border-owner-border">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-owner-heading block truncate">
                    Ready for Showcase
                  </span>
                  <span className="text-[10px] text-owner-muted block truncate">{imageUrl}</span>
                </div>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-owner-heading block mb-1">
              Showcase Title <span className="text-rose-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 4-Tier Gold Foil Royal Wedding Cake"
              className="text-xs"
              required
            />
          </div>

          {/* Category Dropdown & Custom Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-owner-heading block mb-1">
                Category / Occasion
              </label>
              <select
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="w-full text-xs rounded-xl border border-owner-border bg-white px-3 py-2 text-owner-heading focus:outline-none focus:ring-2 focus:ring-brand-plum/20"
              >
                {STANDARD_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="CUSTOM">+ Custom Occasion / Category</option>
              </select>
            </div>

            {categoryName === 'CUSTOM' ? (
              <div>
                <label className="text-xs font-semibold text-owner-heading block mb-1">
                  Custom Category Name
                </label>
                <Input
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="e.g. Corporate, Graduation, Floral"
                  className="text-xs"
                />
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-owner-heading block mb-1">
                  Display Order
                </label>
                <Input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value)}
                  placeholder="0"
                  className="text-xs"
                />
              </div>
            )}
          </div>

          {categoryName === 'CUSTOM' && (
            <div>
              <label className="text-xs font-semibold text-owner-heading block mb-1">
                Display Order
              </label>
              <Input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                placeholder="0"
                className="text-xs"
              />
            </div>
          )}

          {/* Caption / Description */}
          <div>
            <label className="text-xs font-semibold text-owner-heading block mb-1">
              Craftsmanship Story &amp; Details <span className="text-owner-muted font-normal">(Optional)</span>
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              placeholder="Describe the flavors, tier heights, edible florals, or customization technique used..."
              className="w-full text-xs rounded-xl border border-owner-border bg-white p-3 text-owner-heading focus:outline-none focus:ring-2 focus:ring-brand-plum/20"
            />
          </div>

          {/* Active / Storefront Visibility Toggle */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-owner-canvas border border-owner-border">
            <input
              type="checkbox"
              id="isActiveToggle"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-brand-plum focus:ring-brand-plum border-owner-border cursor-pointer"
            />
            <label htmlFor="isActiveToggle" className="text-xs text-owner-heading cursor-pointer">
              <span className="font-semibold block">Visible in Public Gallery</span>
              <span className="text-[10px] text-owner-muted block">
                When enabled, storefront visitors can admire this cake in your gallery portfolio.
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-owner-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || isUploading}
              className="text-xs font-bold gap-1.5"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{editingItem ? 'Update Showcase Photo' : 'Save to Gallery'}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId !== null && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirmId(null)}
          title="Delete Showcase Photo?"
        >
          <div className="space-y-4 pt-2">
            <p className="text-xs text-owner-muted leading-relaxed">
              Are you sure you want to remove this photo from your gallery showcase? This action cannot be undone.
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
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={isDeleting}
                className="text-xs font-bold"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
