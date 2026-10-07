'use client';

import React, { useState } from 'react';
import {
  Tag,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  Layers,
  AlertCircle,
  Hash,
} from 'lucide-react';
import { Category } from '@/types/product';
import { categoriesApi } from '@/lib/api/categories';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DeleteCategoryModal } from './DeleteCategoryModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onCategoriesChanged: () => Promise<void>;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCategoriesChanged,
}) => {
  // New category state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newDisplayOrder, setNewDisplayOrder] = useState('0');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit category state
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDisplayOrder, setEditDisplayOrder] = useState('0');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Delete category state
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setCreateError('Category name is required.');
      return;
    }

    if (trimmed.length > 100) {
      setCreateError('Category name must not exceed 100 characters.');
      return;
    }

    setIsCreating(true);
    try {
      await categoriesApi.createCategory({
        name: trimmed,
        displayOrder: Number(newDisplayOrder) || 0,
      });
      setNewCategoryName('');
      setNewDisplayOrder('0');
      await onCategoriesChanged();
    } catch (err: any) {
      // Handles 409 Conflict, validation errors, or network error
      setCreateError(err.message || 'Failed to create category.');
    } finally {
      setIsCreating(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setEditName(cat.name);
    setEditDisplayOrder(String(cat.displayOrder ?? 0));
    setUpdateError(null);
  };

  const cancelEdit = () => {
    setEditingCategoryId(null);
    setEditName('');
    setEditDisplayOrder('0');
    setUpdateError(null);
  };

  const handleSaveEdit = async (categoryId: number) => {
    setUpdateError(null);
    const trimmed = editName.trim();
    if (!trimmed) {
      setUpdateError('Category name cannot be empty.');
      return;
    }

    setIsUpdating(true);
    try {
      await categoriesApi.updateCategory(categoryId, {
        name: trimmed,
        displayOrder: Number(editDisplayOrder) || 0,
      });
      setEditingCategoryId(null);
      await onCategoriesChanged();
    } catch (err: any) {
      setUpdateError(err.message || 'Failed to update category.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTrigger = (cat: Category) => {
    setCategoryToDelete(cat);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (categoryId: number, reassignToCategoryId?: number) => {
    await categoriesApi.deleteCategory(categoryId, reassignToCategoryId);
    await onCategoriesChanged();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Manage Product Categories"
        description="Organize your cakes into shop-specific categories for customers"
        maxWidth="lg"
      >
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
          {/* Create New Category Form */}
          <form
            onSubmit={handleCreateCategory}
            className="p-4 rounded-2xl bg-brand-cream-light/60 border border-brand-border space-y-3"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-brand-espresso font-serif">
              <Sparkles className="w-3.5 h-3.5 text-brand-plum" />
              <span>Create New Category</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-8 space-y-1">
                <label className="text-[11px] font-semibold text-brand-espresso block">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Birthday Cakes, Jar Cakes, Cheesecakes"
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value);
                    if (createError) setCreateError(null);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-brand-border bg-white text-brand-espresso placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-plum/20 focus:border-brand-plum"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-brand-espresso block">Order</label>
                <input
                  type="number"
                  placeholder="0"
                  value={newDisplayOrder}
                  onChange={(e) => setNewDisplayOrder(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-brand-border bg-white text-brand-espresso placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-plum/20 focus:border-brand-plum"
                />
              </div>

              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isCreating}
                  className="w-full text-xs h-[34px]"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </div>
            </div>

            {createError && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{createError}</span>
              </div>
            )}
          </form>

          {/* Categories List Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-plum" />
                <h4 className="text-xs font-bold font-serif text-brand-espresso">
                  Bakery Categories ({categories.length})
                </h4>
              </div>
              <span className="text-[11px] text-brand-muted">
                Empty categories stay hidden from public storefront
              </span>
            </div>

            {updateError && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{updateError}</span>
              </div>
            )}

            {categories.length === 0 ? (
              <div className="py-10 text-center rounded-2xl border border-dashed border-brand-border bg-brand-cream-light/30 p-6 space-y-2">
                <Tag className="w-8 h-8 text-brand-plum/40 mx-auto" />
                <p className="text-xs font-semibold text-brand-espresso font-serif">
                  No Categories Created Yet
                </p>
                <p className="text-[11px] text-brand-muted max-w-sm mx-auto">
                  Add your custom categories above (like Birthday Cakes, Custom Cakes, Cupcakes) to organize your products.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-brand-border overflow-hidden bg-white shadow-2xs divide-y divide-brand-border/60">
                {categories.map((cat) => {
                  const isEditing = editingCategoryId === cat.id;

                  return (
                    <div
                      key={cat.id}
                      className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-brand-cream-light/30 transition-colors"
                    >
                      {isEditing ? (
                        <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-brand-plum bg-white text-brand-espresso focus:outline-none ring-1 ring-brand-plum/30"
                            placeholder="Category name"
                            autoFocus
                          />
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-brand-muted font-mono">#</span>
                            <input
                              type="number"
                              value={editDisplayOrder}
                              onChange={(e) => setEditDisplayOrder(e.target.value)}
                              className="w-16 px-2 py-1.5 text-xs rounded-lg border border-brand-border bg-white text-brand-espresso focus:outline-none"
                              placeholder="Order"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(cat.id)}
                              disabled={isUpdating}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="p-1.5 rounded-lg bg-gray-50 text-brand-muted hover:bg-gray-100 transition-colors"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-brand-blush/80 flex items-center justify-center text-brand-plum shrink-0">
                            <Tag className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-brand-espresso truncate font-serif">
                              {cat.name}
                            </p>
                            <p className="text-[10px] text-brand-muted flex items-center gap-2">
                              <span>Display order: {cat.displayOrder ?? 0}</span>
                              {cat.slug && <span className="font-mono text-[9px] text-brand-muted/70">/{cat.slug}</span>}
                            </p>
                          </div>
                        </div>
                      )}

                      {!isEditing && (
                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <Badge
                            variant={cat.productCount > 0 ? 'plum' : 'default'}
                            size="sm"
                            className="text-[10px] shrink-0"
                          >
                            {cat.productCount}{' '}
                            {cat.productCount === 1 ? 'cake' : 'cakes'}
                          </Badge>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(cat)}
                              className="p-1.5 text-brand-muted hover:text-brand-plum hover:bg-brand-blush/40 rounded-lg transition-colors cursor-pointer"
                              title="Rename Category"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTrigger(cat)}
                              className="p-1.5 text-brand-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="pt-4 flex justify-end border-t border-brand-border/60">
            <Button variant="primary" type="button" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reassign & Delete Confirmation Modal */}
      {categoryToDelete && categoryToDelete.productCount > 0 ? (
        <DeleteCategoryModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setCategoryToDelete(null);
          }}
          category={categoryToDelete}
          allCategories={categories}
          onConfirmDelete={handleConfirmDelete}
        />
      ) : (
        <ConfirmDialog
          isOpen={isDeleteModalOpen && categoryToDelete !== null}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setCategoryToDelete(null);
          }}
          onConfirm={async () => {
            if (categoryToDelete) {
              await handleConfirmDelete(categoryToDelete.id);
              setIsDeleteModalOpen(false);
              setCategoryToDelete(null);
            }
          }}
          title="Delete Category"
          description={
            <div>
              <p className="text-sm text-brand-espresso mb-2">
                Are you sure you want to delete <span className="font-semibold text-brand-plum">&ldquo;{categoryToDelete?.name}&rdquo;</span>?
              </p>
              <p className="text-xs text-brand-muted">
                This category has no products assigned and can be removed immediately.
              </p>
            </div>
          }
          confirmLabel="Delete Category"
          isDestructive={true}
        />
      )}
    </>
  );
};

