"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef } from "react";
import {
  Search, Plus, Edit, Trash2, Image as ImageIcon, X,
  AlertCircle, Upload
} from "lucide-react";
import {
  getOwnerProducts,
  createOwnerProduct,
  updateOwnerProduct,
  deleteOwnerProduct,
  uploadProductImage,
  normalizeImageUrl,
  Product,
  ProductVariant,
  ProductAddon,
  ProductRequest,
  VariantDto,
  AddonDto
} from "@/lib/api/products";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type VariantForm = { id?: number; name: string; price: string; isAvailable: boolean };
type AddonForm  = { id?: number; name: string; price: string; isAvailable: boolean };

// ── Product Details Modal ─────────────────────────────────────────

interface ProductDetailsModalProps {
  product: Product;
  onClose: () => void;
  onEdit: (p: Product) => void;
}

function ProductDetailsModal({ product, onClose, onEdit }: ProductDetailsModalProps) {
  const imgSrc = normalizeImageUrl(product.imageUrl);
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-xl font-bold text-gray-900">Product Details</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Image */}
          <div className="w-full h-52 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
            {imgSrc ? (
              <img src={imgSrc} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <ImageIcon size={40} />
                <span className="text-sm">No image</span>
              </div>
            )}
          </div>

          {/* Name + Status */}
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
            <span className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium ${
              product.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}>
              {product.status === "ACTIVE" ? "Active" : product.status}
            </span>
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
          )}

          {/* Price + Availability */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Base Price</p>
              <p className="text-lg font-bold text-gray-900">&#8377;{product.price}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Availability</p>
              <p className="text-sm font-medium text-gray-900">
                {product.availability ? "Available" : "Unavailable"}
              </p>
            </div>
          </div>

          {/* Variants */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">Cake Variants</h4>
            {product.variants && product.variants.length > 0 ? (
              <ul className="space-y-2">
                {product.variants.map((v: ProductVariant) => (
                  <li key={v.id} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded-md border border-gray-100">
                    <span className="font-medium text-gray-800">{v.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-700">&#8377;{v.price}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        v.isAvailable ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
                      }`}>{v.isAvailable ? "Available" : "Unavailable"}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-gray-400 italic">No variants</p>}
          </div>

          {/* Add-ons */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">Add-ons</h4>
            {product.addons && product.addons.length > 0 ? (
              <ul className="space-y-2">
                {product.addons.map((a: ProductAddon) => (
                  <li key={a.id} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded-md border border-gray-100">
                    <span className="font-medium text-gray-800">{a.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-700">&#8377;{a.price}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        a.isAvailable ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
                      }`}>{a.isAvailable ? "Available" : "Unavailable"}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-gray-400 italic">No add-ons</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium">
            Close
          </button>
          <button
            onClick={() => onEdit(product)}
            className="px-4 py-2 text-white rounded-md font-medium flex items-center gap-2"
            style={{ backgroundColor: "#4a154b" }}
          >
            <Edit size={16} /> Edit Product
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // details modal
  const [detailsProduct, setDetailsProduct] = useState<Product | null>(null);

  // add/edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ name: "", price: "", description: "" });
  const [variants, setVariants] = useState<VariantForm[]>([]);
  const [addons, setAddons] = useState<AddonForm[]>([]);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("");

  // image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // delete
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true); setError("");
      const data = await getOwnerProducts();
      setProducts(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch products");
    } finally { setIsLoading(false); }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── image helpers
  const clearNewImage = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null); setImagePreviewUrl(null); setImageError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Please select a valid image file (JPG, PNG, GIF, WebP, etc.)");
      e.target.value = ""; return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("Image size must be less than 5MB.");
      e.target.value = ""; return;
    }
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  // ── details
  const openDetails = (product: Product) => setDetailsProduct(product);
  const closeDetails = () => setDetailsProduct(null);

  // ── modal open/close
  const handleOpenModal = (product: Product | null = null) => {
    setFormError(""); setSubmitStatus(""); clearNewImage(); setDetailsProduct(null);
    if (product) {
      setEditingProduct(product);
      setExistingImageUrl(product.imageUrl ?? null);
      setFormData({ name: product.name, price: product.price.toString(), description: product.description || "" });
      setVariants(product.variants
        ? product.variants.map(v => ({ id: v.id, name: v.name, price: v.price.toString(), isAvailable: v.isAvailable }))
        : []);
      setAddons(product.addons
        ? product.addons.map(a => ({ id: a.id, name: a.name, price: a.price.toString(), isAvailable: a.isAvailable }))
        : []);
    } else {
      setEditingProduct(null); setExistingImageUrl(null);
      setFormData({ name: "", price: "", description: "" }); setVariants([]); setAddons([]);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    clearNewImage(); setExistingImageUrl(null);
    setIsModalOpen(false); setFormError(""); setSubmitStatus("");
  };

  // ── variant helpers
  const handleAddVariant = () => setVariants([...variants, { name: "", price: "", isAvailable: true }]);
  const handleRemoveVariant = (i: number) => { const u = [...variants]; u.splice(i, 1); setVariants(u); };
  const handleVariantChange = (i: number, f: keyof VariantForm, v: string | boolean) => {
    const u = [...variants]; u[i] = { ...u[i], [f]: v }; setVariants(u);
  };

  // ── addon helpers
  const handleAddAddon = () => setAddons([...addons, { name: "", price: "", isAvailable: true }]);
  const handleRemoveAddon = (i: number) => { const u = [...addons]; u.splice(i, 1); setAddons(u); };
  const handleAddonChange = (i: number, f: keyof AddonForm, v: string | boolean) => {
    const u = [...addons]; u[i] = { ...u[i], [f]: v }; setAddons(u);
  };

  const friendlyError = (err: any): string => {
    const msg: string = err?.message || "";
    if (msg.includes("401") || msg.includes("403")) return "Unauthorised. Please log in again.";
    if (msg.includes("404")) return "Product not found. It may have already been deleted.";
    if (msg.includes("400")) return "Invalid data. Please check name, price, variants, and addons.";
    if (msg.includes("500")) return "Server error. Please try again in a moment.";
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) return "Network error. Check your connection.";
    return msg || "An unexpected error occurred.";
  };

  // ── save
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(""); setSubmitStatus("");
    if (!formData.name.trim()) { setFormError("Product name is required"); return; }
    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) { setFormError("Please enter a valid price (0 or greater)"); return; }
    for (const v of variants) {
      if (!v.name.trim()) { setFormError("Variant name is required."); return; }
      if (isNaN(parseFloat(v.price)) || parseFloat(v.price) < 0) { setFormError("Variant price must be a valid amount (0 or greater)."); return; }
    }
    for (const a of addons) {
      if (!a.name.trim()) { setFormError("Add-on name is required."); return; }
      if (isNaN(parseFloat(a.price)) || parseFloat(a.price) < 0) { setFormError("Add-on price must be a valid amount (0 or greater)."); return; }
    }

    try {
      setIsSubmitting(true);
      const reqVariants: VariantDto[] = variants.map(v => ({ id: v.id, name: v.name.trim(), price: parseFloat(v.price), isAvailable: v.isAvailable }));
      const reqAddons: AddonDto[] = addons.map(a => ({ id: a.id, name: a.name.trim(), price: parseFloat(a.price), isAvailable: a.isAvailable }));

      const tryUpload = async (): Promise<string | undefined> => {
        if (!imageFile) return undefined;
        setSubmitStatus("Uploading image\u2026");
        try {
          const res = await uploadProductImage(imageFile);
          return res.url;
        } catch (ue: any) {
          throw new Error(
            ue.message?.includes("Upload failed")
              ? ue.message.replace(/^Upload failed \(\d+\): /, "Image upload failed: ")
              : "Image upload failed. Please try again."
          );
        }
      };

      if (editingProduct) {
        let finalImageUrl: string | undefined = existingImageUrl ?? undefined;
        const newUrl = await tryUpload();
        if (newUrl !== undefined) finalImageUrl = newUrl;
        setSubmitStatus("Saving changes\u2026");
        await updateOwnerProduct(editingProduct.id, {
          name: formData.name.trim(), price,
          description: formData.description.trim() || undefined,
          imageUrl: finalImageUrl,
          variants: reqVariants, addons: reqAddons
        });
      } else {
        const newUrl = await tryUpload();
        setSubmitStatus("Creating product\u2026");
        await createOwnerProduct({
          name: formData.name.trim(), price,
          description: formData.description.trim() || undefined,
          imageUrl: newUrl,
          variants: reqVariants, addons: reqAddons
        });
      }

      await fetchProducts();
      clearNewImage(); setExistingImageUrl(null); setIsModalOpen(false);
    } catch (err: any) {
      setFormError(friendlyError(err));
    } finally {
      setIsSubmitting(false); setSubmitStatus("");
    }
  };

  // ── delete
  const handleDeleteClick = (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); setDeleteError(""); setDeletingProductId(id);
  };
  const handleDeleteConfirm = async () => {
    if (deletingProductId === null) return;
    try {
      setIsDeleting(true); setDeleteError("");
      await deleteOwnerProduct(deletingProductId);
      await fetchProducts(); setDeletingProductId(null);
    } catch (err: any) {
      const msg = friendlyError(err);
      if (msg.includes("already been deleted")) { await fetchProducts(); setDeletingProductId(null); }
      else { setDeleteError(msg); }
    } finally { setIsDeleting(false); }
  };
  const handleDeleteCancel = () => { if (isDeleting) return; setDeletingProductId(null); setDeleteError(""); };
  const deletingProduct = products.find(p => p.id === deletingProductId);

  // image preview to show in modal: newly selected > existing saved > nothing
  const modalPreviewSrc = imagePreviewUrl
    ? imagePreviewUrl
    : existingImageUrl ? normalizeImageUrl(existingImageUrl) : null;

  // ── render
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Product Management</h2>
          <p className="text-sm text-gray-500 mt-1">Add, edit, or remove cakes from your storefront.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text" placeholder="Search products..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap text-sm font-medium"
            style={{ backgroundColor: "#4a154b" }}
          >
            <Plus size={18} /><span className="hidden sm:inline">New Product</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle size={20} /><p>{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Variants &amp; Add-ons</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "#4a154b" }}></div>
                  </div>
                  <p className="mt-4">Loading products&#8230;</p>
                </td></tr>
              ) : filteredProducts.length > 0 ? filteredProducts.map((product) => (
                <tr
                  key={product.id}
                  className="hover:bg-purple-50 transition-colors cursor-pointer"
                  onClick={() => openDetails(product)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400 shrink-0 overflow-hidden">
                        {product.imageUrl
                          ? <img src={normalizeImageUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-cover" />
                          : <ImageIcon size={20} />}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        {product.description && <p className="text-xs text-gray-500 mt-0.5 max-w-xs truncate">{product.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900">
                      {product.variants && product.variants.length > 0
                        ? `${product.variants.length} variant${product.variants.length > 1 ? "s" : ""}`
                        : <span className="text-gray-400">No variants</span>}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {product.addons && product.addons.length > 0
                        ? `${product.addons.length} add-on${product.addons.length > 1 ? "s" : ""}`
                        : <span className="text-gray-400">No add-ons</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">&#8377;{product.price}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      product.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {product.status === "ACTIVE" ? "Active" : product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenModal(product); }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors inline-flex items-center"
                      title="Edit"
                      disabled={isDeleting && deletingProductId === product.id}
                    ><Edit size={16} /></button>
                    <button
                      onClick={(e) => handleDeleteClick(e, product.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors inline-flex items-center disabled:opacity-50"
                      title="Delete"
                      disabled={isDeleting && deletingProductId === product.id}
                    ><Trash2 size={16} /></button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No cakes added yet. Click &quot;New Product&quot; to add one.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {detailsProduct && (
        <ProductDetailsModal
          product={detailsProduct}
          onClose={closeDetails}
          onEdit={(p) => { closeDetails(); handleOpenModal(p); }}
        />
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-900">
                {editingProduct ? "Edit Product" : "Add New Product"}
              </h3>
              <button onClick={handleCloseModal} disabled={isSubmitting} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 disabled:opacity-50">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-6">
              {formError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-md flex items-center gap-2 text-sm">
                  <AlertCircle size={16} /><span>{formError}</span>
                </div>
              )}

              {/* Basic Details */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 border-b pb-2">Basic Details</h4>

                {/* Image - shown for create AND edit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Image <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  {modalPreviewSrc ? (
                    <div className="relative w-full h-40 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                      <img src={modalPreviewSrc} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isSubmitting}
                          className="px-2 py-1 bg-white text-xs font-medium text-gray-700 border border-gray-300 rounded shadow-sm hover:bg-gray-50 disabled:opacity-50"
                        >{editingProduct ? "Change Image" : "Change"}</button>
                        {imagePreviewUrl && (
                          <button
                            type="button" onClick={clearNewImage} disabled={isSubmitting}
                            className="p-1 bg-white text-gray-500 border border-gray-300 rounded shadow-sm hover:bg-gray-50 disabled:opacity-50"
                            title="Discard new image"
                          ><X size={14} /></button>
                        )}
                      </div>
                      {imagePreviewUrl && (
                        <div className="absolute bottom-2 left-2 bg-white text-xs text-purple-700 font-medium px-2 py-0.5 rounded shadow-sm border border-purple-200">
                          New image selected
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}
                      className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload size={24} />
                      <span className="text-sm">Click to select an image</span>
                      <span className="text-xs text-gray-400">JPG, PNG, WebP &mdash; max 5MB</span>
                    </button>
                  )}
                  {imageError && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle size={12} />{imageError}
                    </p>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                    <input
                      type="text" required placeholder="e.g. Chocolate Truffle Cake"
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (&#8377;) *</label>
                    <input
                      type="number" required min="0" step="0.01" placeholder="e.g. 499"
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    rows={3} placeholder="Describe your product (optional)"
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
                    value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              {/* Variants */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="font-semibold text-gray-900">Cake Variants <span className="text-gray-400 font-normal text-sm">(optional)</span></h4>
                  <button type="button" onClick={handleAddVariant} disabled={isSubmitting}
                    className="text-sm text-purple-700 font-medium hover:text-purple-800 disabled:opacity-50 flex items-center gap-1">
                    <Plus size={16} /> Add Variant
                  </button>
                </div>
                {variants.length === 0
                  ? <p className="text-sm text-gray-500 italic">No variants added. The base price will be used.</p>
                  : <div className="space-y-3">{variants.map((variant, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="flex-1 w-full">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Variant Name</label>
                        <input type="text" placeholder="e.g. 500g" required
                          className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          value={variant.name} onChange={(e) => handleVariantChange(index, "name", e.target.value)} />
                      </div>
                      <div className="w-full sm:w-32">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Price (&#8377;)</label>
                        <input type="number" placeholder="e.g. 499" required min="0" step="0.01"
                          className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          value={variant.price} onChange={(e) => handleVariantChange(index, "price", e.target.value)} />
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto pt-1 sm:pt-5">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                          <input type="checkbox" className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            checked={variant.isAvailable} onChange={(e) => handleVariantChange(index, "isAvailable", e.target.checked)} />
                          Available
                        </label>
                        <button type="button" onClick={() => handleRemoveVariant(index)}
                          className="ml-auto sm:ml-2 text-gray-400 hover:text-red-500 transition-colors" title="Remove Variant">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}</div>}
              </div>

              {/* Add-ons */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="font-semibold text-gray-900">Add-ons <span className="text-gray-400 font-normal text-sm">(optional)</span></h4>
                  <button type="button" onClick={handleAddAddon} disabled={isSubmitting}
                    className="text-sm text-purple-700 font-medium hover:text-purple-800 disabled:opacity-50 flex items-center gap-1">
                    <Plus size={16} /> Add Add-on
                  </button>
                </div>
                {addons.length === 0
                  ? <p className="text-sm text-gray-500 italic">No add-ons added.</p>
                  : <div className="space-y-3">{addons.map((addon, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="flex-1 w-full">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Add-on Name</label>
                        <input type="text" placeholder="e.g. Extra Candles" required
                          className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          value={addon.name} onChange={(e) => handleAddonChange(index, "name", e.target.value)} />
                      </div>
                      <div className="w-full sm:w-32">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Price (&#8377;)</label>
                        <input type="number" placeholder="e.g. 30" required min="0" step="0.01"
                          className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          value={addon.price} onChange={(e) => handleAddonChange(index, "price", e.target.value)} />
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto pt-1 sm:pt-5">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                          <input type="checkbox" className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            checked={addon.isAvailable} onChange={(e) => handleAddonChange(index, "isAvailable", e.target.checked)} />
                          Available
                        </label>
                        <button type="button" onClick={() => handleRemoveAddon(index)}
                          className="ml-auto sm:ml-2 text-gray-400 hover:text-red-500 transition-colors" title="Remove Add-on">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}</div>}
              </div>

              {/* Submit row */}
              <div className="pt-4 border-t border-gray-200 flex justify-end gap-3 items-center">
                {submitStatus && <span className="text-sm text-gray-500 mr-auto">{submitStatus}</span>}
                <button type="button" onClick={handleCloseModal} disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="px-4 py-2 text-white rounded-md font-medium disabled:opacity-60 flex items-center gap-2"
                  style={{ backgroundColor: "#4a154b" }}>
                  {isSubmitting
                    ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving&#8230;</>
                    : (editingProduct ? "Save Changes" : "Create Product")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingProductId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">Delete Product</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-gray-800">{deletingProduct?.name ?? "this cake"}</span>?
                  This action cannot be undone.
                </p>
                {deleteError && (
                  <div className="mt-3 bg-red-50 text-red-700 p-3 rounded-md flex items-center gap-2 text-sm">
                    <AlertCircle size={16} /><span>{deleteError}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={handleDeleteCancel} disabled={isDeleting}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 disabled:opacity-60 flex items-center gap-2">
                {isDeleting
                  ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Deleting&#8230;</>
                  : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
