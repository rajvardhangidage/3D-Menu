import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  apiRequest, deleteUploadedImage, getCafe, getCafeMenuUrl, getCategories, getItems, getQrCode, getQrPdf,
  uploadImage, validateImageFile,
  type Cafe, type CategoryPayload, type CategorySummary, type ItemPayload,
} from "../../api/admin";
import type { MenuItem } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { Button, ConfirmDelete, EmptyState, ErrorState, Field, LoadingState, Modal, PageHeader } from "../../components/admin/Ui";

type ModalState =
  | { kind: "category"; value: CategorySummary | null }
  | { kind: "item"; value: MenuItem | null }
  | { kind: "delete-cafe" }
  | { kind: "delete-category"; value: CategorySummary }
  | { kind: "delete-item"; value: MenuItem }
  | null;

function price(value: number, currencyCode: string) {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode }).format(value); }
  catch { return `${currencyCode} ${value.toFixed(2)}`; }
}

export default function CafeDetailsPage() {
  const { cafeId = "" } = useParams();
  const { token } = useAuth();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [busy, setBusy] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [menuUrl, setMenuUrl] = useState("");
  const [qrError, setQrError] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [qrRetry, setQrRetry] = useState(0);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const selectedCategory = useMemo(() => categories.find((category) => category.id === selectedCategoryId) ?? null, [categories, selectedCategoryId]);
  const selectedCategoryRef = useRef(selectedCategoryId);
  selectedCategoryRef.current = selectedCategoryId;

  const loadItems = useCallback(async (categoryId: string) => {
    if (!token || !categoryId) { setItems([]); return; }
    setItemsLoading(true);
    try { setItems(await getItems(token, categoryId)); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : "Could not load menu items."); }
    finally { setItemsLoading(false); }
  }, [token]);

  const loadPage = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError("");
    try {
      const [cafeResult, categoryResult] = await Promise.all([getCafe(token, cafeId), getCategories(token, cafeId)]);
      setCafe(cafeResult);
      setCategories(categoryResult);
      const currentCategory = selectedCategoryRef.current;
      const nextId = categoryResult.some((category) => category.id === currentCategory)
        ? currentCategory : categoryResult[0]?.id ?? "";
      setSelectedCategoryId(nextId);
      if (nextId) await loadItems(nextId);
      else setItems([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load cafe details.");
    } finally { setLoading(false); }
  }, [cafeId, loadItems, token]);

  useEffect(() => { void loadPage(); }, [loadPage]);
  useEffect(() => () => { if (qrUrl) URL.revokeObjectURL(qrUrl); }, [qrUrl]);
  useEffect(() => {
    if (!token || !cafe) return;
    let cancelled = false;
    setQrLoading(true);
    setQrError("");
    Promise.all([getCafeMenuUrl(token, cafe.id), getQrCode(token, cafe.id)])
      .then(([details, image]) => {
        if (cancelled) return;
        setMenuUrl(details.menuUrl);
        setQrUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return URL.createObjectURL(image);
        });
      })
      .catch((cause: unknown) => {
        if (!cancelled) setQrError(cause instanceof Error ? cause.message : "Unable to load the cafe QR code.");
      })
      .finally(() => { if (!cancelled) setQrLoading(false); });
    return () => { cancelled = true; };
  }, [cafe, qrRetry, token]);

  async function refreshCategories(keepId = selectedCategoryId) {
    if (!token) return;
    const updated = await getCategories(token, cafeId);
    setCategories(updated);
    const target = updated.some((category) => category.id === keepId) ? keepId : updated[0]?.id ?? "";
    setSelectedCategoryId(target);
    await loadItems(target);
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || modal?.kind !== "category") return;
    const data = new FormData(event.currentTarget);
    const payload: CategoryPayload = { name: String(data.get("name")).trim(), displayOrder: Number(data.get("displayOrder")) };
    setBusy(true); setActionError("");
    try {
      const result = await apiRequest<CategorySummary>(
        modal.value ? `/categories/${modal.value.id}` : `/cafes/${cafeId}/categories`, token,
        { method: modal.value ? "PUT" : "POST", body: JSON.stringify(payload) },
      );
      setModal(null);
      await refreshCategories(result.id);
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Unable to save category."); }
    finally { setBusy(false); }
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || modal?.kind !== "item") return;
    const data = new FormData(event.currentTarget);
    const half = String(data.get("halfPrice")).trim();
    let payload: ItemPayload = {
      categoryId: String(data.get("categoryId")),
      name: String(data.get("name")).trim(),
      description: String(data.get("description")).trim() || null,
      imageUrl: String(data.get("imageUrl")).trim() || null,
      imagePublicId: String(data.get("imagePublicId")).trim() || null,
      halfPrice: half ? Number(half) : null,
      fullPrice: Number(data.get("fullPrice")),
      available: data.get("available") === "on",
      displayOrder: Number(data.get("displayOrder")),
    };
    setBusy(true); setActionError(""); setImageUploadProgress(0);
    let uploadedPublicId: string | null = null;
    try {
      const selectedImage = data.get("imageFile");
      if (selectedImage instanceof File && selectedImage.size > 0) {
        const uploaded = await uploadImage(token, selectedImage, setImageUploadProgress);
        uploadedPublicId = uploaded.publicId;
        payload = { ...payload, imageUrl: uploaded.secureUrl, imagePublicId: uploaded.publicId };
      }
      await apiRequest(modal.value ? `/items/${modal.value.id}` : "/items", token, {
        method: modal.value ? "PUT" : "POST", body: JSON.stringify(payload),
      });
      setModal(null);
      if (payload.categoryId !== selectedCategoryId) setSelectedCategoryId(payload.categoryId);
      await loadItems(payload.categoryId);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to save menu item.";
      if (uploadedPublicId) {
        try { await deleteUploadedImage(token, uploadedPublicId); }
        catch (cleanupCause) {
          const cleanupMessage = cleanupCause instanceof Error ? cleanupCause.message : "Could not remove the uncommitted image.";
          setActionError(`${message} ${cleanupMessage}`);
          setBusy(false);
          return;
        }
      }
      setActionError(message);
    }
    finally { setBusy(false); }
  }

  async function deleteCategory(category: CategorySummary) {
    if (!token) return;
    setBusy(true); setActionError("");
    try {
      await apiRequest(`/categories/${category.id}`, token, { method: "DELETE" });
      setModal(null);
      await refreshCategories("");
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Unable to delete category."); }
    finally { setBusy(false); }
  }

  async function deleteCafe() {
    if (!token) return;
    setBusy(true); setActionError("");
    try {
      await apiRequest(`/cafes/${cafeId}`, token, { method: "DELETE" });
      window.location.assign("/admin");
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Unable to delete cafe."); }
    finally { setBusy(false); }
  }

  async function deleteItem(item: MenuItem) {
    if (!token) return;
    setBusy(true); setActionError("");
    try {
      await apiRequest(`/items/${item.id}`, token, { method: "DELETE" });
      setModal(null);
      await loadItems(selectedCategoryId);
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Unable to delete menu item."); }
    finally { setBusy(false); }
  }

  async function toggleAvailability(item: MenuItem) {
    if (!token || !selectedCategoryId) return;
    setActionError("");
    try {
      await apiRequest(`/items/${item.id}`, token, {
        method: "PUT",
        body: JSON.stringify({
          categoryId: selectedCategoryId, name: item.name, description: item.description,
          imageUrl: item.imageUrl, imagePublicId: item.imagePublicId, halfPrice: item.halfPrice, fullPrice: item.fullPrice,
          available: !item.available, displayOrder: item.displayOrder,
        }),
      });
      await loadItems(selectedCategoryId);
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Could not update availability."); }
  }

  async function downloadPrintableQr() {
    if (!token || !cafe) return;
    setPdfLoading(true);
    try {
      const objectUrl = URL.createObjectURL(await getQrPdf(token, cafe.id));
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `menu-${cafe.slug}.pdf`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (cause) {
      setQrError(cause instanceof Error ? cause.message : "Unable to download the printable QR code.");
    } finally { setPdfLoading(false); }
  }

  if (loading) return <LoadingState label="Loading cafe…" />;
  if (error || !cafe) return <ErrorState message={error || "Cafe not found."} retry={() => void loadPage()} />;

  const newItem = () => { setActionError(""); setModal({ kind: "item", value: null }); };
  const newCategory = () => { setActionError(""); setModal({ kind: "category", value: null }); };

  return (
    <>
      <div className="breadcrumbs"><Link to="/admin">Cafes</Link><span>/</span><span>{cafe.name}</span></div>
      <PageHeader eyebrow="CAFE / MENU MANAGEMENT" title={cafe.name} description={cafe.address || "Manage cafe information, categories, and menu items."}
        action={<div className="header-actions"><Button type="button" variant="danger" onClick={() => setModal({ kind: "delete-cafe" })}>Delete cafe</Button><Link to={`/admin/cafes/${cafe.id}/edit`}><Button variant="secondary" type="button">Edit cafe</Button></Link></div>} />

      <section className="cafe-summary admin-panel">
        <div className="summary-brand">{cafe.logoUrl ? <img src={cafe.logoUrl} alt="" /> : <span>{cafe.name.charAt(0).toUpperCase()}</span>}</div>
        <div className="summary-copy"><span className="summary-label">PUBLIC MENU</span>{menuUrl ? <a href={menuUrl} target="_blank" rel="noreferrer">{menuUrl} <span>↗</span></a> : <small>Loading configured menu URL…</small>}<small>{cafe.phone || "No phone number"}</small></div>
        <div className="summary-status"><span className={`status-pill${cafe.active ? " active" : " inactive"}`}><i />{cafe.active ? "Active" : "Inactive"}</span><small>{categories.length} {categories.length === 1 ? "category" : "categories"}</small></div>
      </section>

      <section className="qr-management admin-panel" aria-label="Cafe QR code">
        <div className="qr-management-copy">
          <span className="summary-label">CUSTOMER MENU QR</span>
          <h2>{cafe.name}</h2>
          <p>Scan to open the cafe’s current menu. The QR destination stays the same when you update menu content.</p>
          {menuUrl && <a href={menuUrl} target="_blank" rel="noreferrer">{menuUrl} ↗</a>}
          <div className="qr-management-actions">
            {qrUrl && <a className="admin-button secondary qr-download" href={qrUrl} download={`menu-${cafe.slug}.png`}>Download PNG</a>}
            <Button type="button" variant="secondary" onClick={() => void downloadPrintableQr()} disabled={pdfLoading || qrLoading}>
              {pdfLoading ? "Preparing PDF…" : "Download printable PDF"}
            </Button>
          </div>
          {!cafe.active && <small className="qr-inactive-note">This cafe is inactive, so its public menu is currently unavailable.</small>}
          {qrError && <p className="qr-error" role="alert">{qrError} <button type="button" onClick={() => setQrRetry((retry) => retry + 1)}>Retry</button></p>}
        </div>
        <div className="qr-preview">
          {qrLoading ? <LoadingState label="Generating QR…" /> : qrUrl ? <img src={qrUrl} alt={`QR code for ${cafe.name} menu`} /> : <div className="qr-placeholder">QR unavailable</div>}
        </div>
      </section>

      {actionError && <div className="form-error action-error" role="alert">{actionError}<button onClick={() => setActionError("")}>×</button></div>}
      <section className="admin-panel menu-manager">
        <div className="panel-heading menu-panel-heading"><div><h2>Menu builder</h2><p>Organize your sections and the items guests can discover.</p></div><Button type="button" variant="secondary" onClick={newCategory}>＋ Add category</Button></div>
        <div className="category-manager">
          <aside className="category-sidebar">
            <div className="category-sidebar-heading"><span>CATEGORIES <small>{categories.length}</small></span></div>
            {categories.length === 0 ? <p className="category-empty">Create a category to start adding menu items.</p> : categories.map((category) => (
              <div className={`category-nav-row${selectedCategoryId === category.id ? " selected" : ""}`} key={category.id}>
                <button className="category-select" onClick={() => { setSelectedCategoryId(category.id); setActionError(""); void loadItems(category.id); }}>
                  <span className="category-order">{String(category.displayOrder + 1).padStart(2, "0")}</span><span>{category.name}</span>
                </button>
                <div className="category-actions">
                  <button title="Edit category" onClick={() => { setActionError(""); setModal({ kind: "category", value: category }); }}>✎</button>
                  <button title="Delete category" onClick={() => { setActionError(""); setModal({ kind: "delete-category", value: category }); }}>×</button>
                </div>
              </div>
            ))}
          </aside>
          <div className="items-area">
            {!selectedCategory ? <EmptyState title="Your menu starts here" description="Add a category, like Breakfast or Drinks, then fill it with menu items." action={<Button type="button" onClick={newCategory}>＋ Add category</Button>} /> : (
              <>
                <div className="items-area-heading"><div><span className="page-eyebrow">CATEGORY / {String(selectedCategory.displayOrder + 1).padStart(2, "0")}</span><h3>{selectedCategory.name}</h3></div><Button type="button" onClick={newItem}>＋ Add item</Button></div>
                {itemsLoading ? <LoadingState label="Loading items…" /> : items.length === 0 ? (
                  <EmptyState title="No menu items yet" description="Add the first item in this category." action={<Button type="button" onClick={newItem}>Add a menu item</Button>} />
                ) : (
                  <div className="items-list">
                    {items.map((item) => (
                      <article className={`admin-item-row${item.available ? "" : " unavailable"}`} key={item.id}>
                        <div className="item-thumb">{item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span>✦</span>}</div>
                        <div className="item-admin-copy"><div className="item-admin-title"><strong>{item.name}</strong>{!item.available && <span className="soldout-pill">Unavailable</span>}</div><p>{item.description || "No description"}</p><small>ORDER {String(item.displayOrder).padStart(2, "0")}</small></div>
                        <div className="item-admin-price">{item.halfPrice !== null && <small>Half {price(item.halfPrice, cafe.currencyCode)}</small>}<strong>{item.halfPrice !== null ? "Full " : ""}{price(item.fullPrice, cafe.currencyCode)}</strong></div>
                        <div className="item-row-actions">
                          <button className={`mini-switch${item.available ? " on" : ""}`} role="switch" aria-checked={item.available} aria-label={`${item.available ? "Mark" : "Make"} ${item.name} ${item.available ? "unavailable" : "available"}`} onClick={() => void toggleAvailability(item)}><span /></button>
                          <button title="Edit item" onClick={() => { setActionError(""); setModal({ kind: "item", value: item }); }}>✎</button>
                          <button className="delete-icon" title="Delete item" onClick={() => { setActionError(""); setModal({ kind: "delete-item", value: item }); }}>×</button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {modal?.kind === "category" && <CategoryFormModal value={modal.value} busy={busy} error={actionError} onClose={() => setModal(null)} onSubmit={saveCategory} />}
      {modal?.kind === "item" && <ItemFormModal value={modal.value} categories={categories} defaultCategoryId={selectedCategoryId} busy={busy} uploadProgress={imageUploadProgress} error={actionError} onClose={() => setModal(null)} onSubmit={saveItem} onError={setActionError} />}
      {modal?.kind === "delete-cafe" && <ConfirmDelete title="Delete cafe?" description={`“${cafe.name}” and its categories and menu items will be permanently deleted.`} busy={busy} error={actionError} onCancel={() => setModal(null)} onConfirm={() => void deleteCafe()} />}
      {modal?.kind === "delete-category" && <ConfirmDelete title="Delete category?" description={`“${modal.value.name}” and all its menu items will be permanently deleted.`} busy={busy} error={actionError} onCancel={() => setModal(null)} onConfirm={() => void deleteCategory(modal.value)} />}
      {modal?.kind === "delete-item" && <ConfirmDelete title="Delete menu item?" description={`“${modal.value.name}” will be permanently removed from the menu.`} busy={busy} error={actionError} onCancel={() => setModal(null)} onConfirm={() => void deleteItem(modal.value)} />}
    </>
  );
}

function CategoryFormModal({ value, busy, error, onClose, onSubmit }: {
  value: CategorySummary | null; busy: boolean; error: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return <Modal title={value ? "Edit category" : "Add a category"} description="Categories help guests browse the menu." onClose={onClose}>
    <form className="admin-form" onSubmit={onSubmit}>
      {error && <div className="form-error modal-inline-error" role="alert">{error}</div>}
      <Field label="Category name"><input name="name" required maxLength={120} defaultValue={value?.name ?? ""} placeholder="e.g. Small plates" /></Field>
      <Field label="Display order" hint="Lower numbers appear first."><input name="displayOrder" type="number" min="0" required defaultValue={value?.displayOrder ?? 0} /></Field>
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button disabled={busy}>{busy ? "Saving…" : value ? "Save category" : "Add category"}</Button></div>
    </form>
  </Modal>;
}

function ItemFormModal({ value, categories, defaultCategoryId, busy, uploadProgress, error, onClose, onSubmit, onError }: {
  value: MenuItem | null; categories: CategorySummary[]; defaultCategoryId: string;
  busy: boolean; uploadProgress: number; error: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onError: (message: string) => void;
}) {
  const [imageUrl, setImageUrl] = useState(value?.imageUrl ?? "");
  const [imagePublicId, setImagePublicId] = useState(value?.imagePublicId ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl); }, [imagePreviewUrl]);
  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    try {
      validateImageFile(file);
      setImageFile(file);
      setImagePreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(file);
      });
      onError("");
    } catch (cause) {
      event.currentTarget.value = "";
      setImageFile(null);
      setImagePreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return "";
      });
      onError(cause instanceof Error ? cause.message : "Choose a valid image.");
    }
  }
  return <Modal title={value ? "Edit menu item" : "Add a menu item"} description="Add clear details so guests know what to expect." onClose={onClose} wide>
    <form className="admin-form" onSubmit={onSubmit}>
      {error && <div className="form-error modal-inline-error" role="alert">{error}</div>}
      <div className="form-grid">
        <Field label="Category"><select name="categoryId" defaultValue={value ? categories.find((category) => category.id === defaultCategoryId)?.id ?? defaultCategoryId : defaultCategoryId} required>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></Field>
        <Field label="Item name"><input name="name" required maxLength={160} defaultValue={value?.name ?? ""} placeholder="e.g. Garden focaccia" /></Field>
        <Field label="Description" className="span-2"><textarea name="description" rows={3} maxLength={4000} defaultValue={value?.description ?? ""} placeholder="Ingredients, flavour, or a little story…" /></Field>
        <Field label="Half price" hint="Optional. Leave blank if not offered."><input name="halfPrice" type="number" min="0" step="0.01" defaultValue={value?.halfPrice ?? ""} placeholder="0.00" /></Field>
        <Field label="Full price"><input name="fullPrice" type="number" min="0" step="0.01" required defaultValue={value?.fullPrice ?? ""} placeholder="0.00" /></Field>
        <Field label="Display order" hint="Lower numbers appear first."><input name="displayOrder" type="number" min="0" required defaultValue={value?.displayOrder ?? 0} /></Field>
        <input type="hidden" name="imageUrl" value={imageUrl} />
        <input type="hidden" name="imagePublicId" value={imagePublicId} />
      </div>
      <div className="item-image-upload">
        <div className="item-image-preview">{imagePreviewUrl || imageUrl ? <img src={imagePreviewUrl || imageUrl} alt="Menu item preview" /> : <span>＋</span>}</div>
        <div><strong>Menu item image</strong><small>PNG, JPG, GIF, or WebP · Max 10 MB · Preview before saving</small><label className={`upload-button${busy ? " disabled" : ""}`}>{imageFile ? "Choose another image" : imageUrl ? "Replace image" : "Choose image"}<input ref={imageInput} type="file" name={imageFile ? "imageFile" : undefined} accept="image/png,image/jpeg,image/gif,image/webp" disabled={busy} onChange={chooseImage} /></label>{(imageFile || imageUrl) && <button className="image-remove-button" type="button" disabled={busy} onClick={() => { setImageFile(null); setImagePreviewUrl(""); setImageUrl(""); setImagePublicId(""); if (imageInput.current) imageInput.current.value = ""; }}>Remove image</button>}{busy && imageFile && <small className="upload-progress-label">Uploading image… {uploadProgress}%</small>}</div>
      </div>
      <label className="checkbox-field"><input type="checkbox" name="available" defaultChecked={value?.available ?? true} /><span><strong>Available on the menu</strong><small>Unavailable items are hidden from guests.</small></span></label>
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button disabled={busy}>{busy ? imageFile ? `Uploading… ${uploadProgress}%` : "Saving…" : value ? "Save item" : "Add item"}</Button></div>
    </form>
  </Modal>;
}
