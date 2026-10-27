import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  apiRequest, deleteUploadedImage, getCafe, uploadImage, validateImageFile,
  type Cafe, type CafePayload,
} from "../../api/admin";
import { useAuth } from "../../auth/AuthContext";
import { Button, ErrorState, Field, LoadingState, PageHeader } from "../../components/admin/Ui";

const blankForm: CafePayload = {
  name: "", slug: "", logoUrl: null, logoPublicId: null, description: "", address: "", phone: "", currencyCode: "USD", active: true,
};

function slugify(name: string) {
  return name.normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function CafeFormPage() {
  const { cafeId } = useParams();
  const editing = Boolean(cafeId);
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<CafePayload>(blankForm);
  const [slugTouched, setSlugTouched] = useState(editing);
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !cafeId) return;
    getCafe(token, cafeId).then((cafe: Cafe) => {
      setForm({
        name: cafe.name, slug: cafe.slug, logoUrl: cafe.logoUrl, logoPublicId: cafe.logoPublicId,
        description: cafe.description ?? "",
        address: cafe.address ?? "", phone: cafe.phone ?? "", currencyCode: cafe.currencyCode, active: cafe.active,
      });
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load cafe."))
      .finally(() => setLoading(false));
  }, [cafeId, token]);
  useEffect(() => () => { if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl); }, [logoPreviewUrl]);

  function change<K extends keyof CafePayload>(key: K, value: CafePayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function chooseLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      validateImageFile(file);
      setLogoFile(file);
      setLogoPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(file);
      });
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Choose a valid image.");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setBusy(true); setError(""); setUploadProgress(0);
    let uploadedPublicId: string | null = null;
    try {
      let payload = form;
      if (logoFile) {
        const uploaded = await uploadImage(token, logoFile, setUploadProgress);
        uploadedPublicId = uploaded.publicId;
        payload = { ...form, logoUrl: uploaded.secureUrl, logoPublicId: uploaded.publicId };
      }
      const result = await apiRequest<Cafe>(editing ? `/cafes/${cafeId}` : "/cafes", token, {
        method: editing ? "PUT" : "POST", body: JSON.stringify(payload),
      });
      navigate(editing ? `/admin/cafes/${cafeId}` : `/admin/cafes/${result.id}`, { replace: true });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to save cafe.";
      if (uploadedPublicId) {
        try { await deleteUploadedImage(token, uploadedPublicId); }
        catch (cleanupCause) {
          const cleanupMessage = cleanupCause instanceof Error ? cleanupCause.message : "Could not remove the uncommitted image.";
          setError(`${message} ${cleanupMessage}`);
          setBusy(false);
          return;
        }
      }
      setError(message);
    } finally { setBusy(false); }
  }

  if (loading) return <LoadingState label="Loading cafe…" />;
  if (error && editing && !form.name) return <ErrorState message={error} retry={() => window.location.reload()} />;

  return (
    <>
      <div className="breadcrumbs"><Link to="/admin">Cafes</Link><span>/</span><span>{editing ? form.name || "Edit cafe" : "New cafe"}</span></div>
      <PageHeader eyebrow={editing ? "CAFE SETTINGS" : "NEW LOCATION"} title={editing ? "Edit cafe" : "Add a cafe"} description="This information appears on the public menu experience." />
      {error && <div className="form-error" role="alert">{error}</div>}
      <form className="editor-layout" onSubmit={submit}>
        <div className="editor-main">
          <section className="admin-panel form-panel">
            <div className="form-section-title"><span>01</span><div><h2>Basic information</h2><p>Tell guests about this place.</p></div></div>
            <div className="form-grid">
              <Field label="Cafe name" className="span-2"><input required maxLength={160} value={form.name} onChange={(event) => { change("name", event.target.value); if (!slugTouched) change("slug", slugify(event.target.value)); }} placeholder="e.g. Casa Verde" /></Field>
              <Field label="Menu URL" hint="Use lowercase letters, numbers, and hyphens."><div className="slug-input"><span>/cafe/</span><input required pattern="[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*" maxLength={160} value={form.slug} onChange={(event) => { setSlugTouched(true); change("slug", event.target.value); }} placeholder="casa-verde" /></div></Field>
              <Field label="Phone number"><input maxLength={40} value={form.phone ?? ""} onChange={(event) => change("phone", event.target.value)} placeholder="+1 (555) 000-0000" /></Field>
              <Field label="Currency code" hint="Three-letter currency code, e.g. USD or EUR."><input required pattern="[A-Z]{3}" maxLength={3} value={form.currencyCode} onChange={(event) => change("currencyCode", event.target.value.toUpperCase())} placeholder="USD" /></Field>
              <Field label="Address" className="span-2"><input maxLength={1000} value={form.address ?? ""} onChange={(event) => change("address", event.target.value)} placeholder="Street address, city" /></Field>
              <Field label="Description" className="span-2"><textarea rows={4} maxLength={4000} value={form.description ?? ""} onChange={(event) => change("description", event.target.value)} placeholder="A short introduction to the cafe…" /></Field>
            </div>
          </section>
          <section className="admin-panel form-panel">
            <div className="form-section-title"><span>02</span><div><h2>Brand & status</h2><p>Set the cafe image and menu availability.</p></div></div>
            <div className="logo-upload-row">
              <div className="logo-preview">{logoPreviewUrl || form.logoUrl ? <img src={logoPreviewUrl || form.logoUrl || ""} alt="Cafe logo preview" /> : <span>{form.name ? form.name.charAt(0).toUpperCase() : "＋"}</span>}</div>
              <div><strong>Cafe logo</strong><p>PNG, JPG, GIF, or WebP · Max 10 MB. Preview before saving.</p><label className={`upload-button${busy ? " disabled" : ""}`}>{logoFile ? "Choose another image" : form.logoUrl ? "Replace image" : "Choose image"}<input type="file" accept="image/png,image/jpeg,image/gif,image/webp" disabled={busy} onChange={chooseLogo} /></label>{(logoFile || form.logoUrl) && <button className="image-remove-button" type="button" disabled={busy} onClick={() => { setLogoFile(null); setLogoPreviewUrl((current) => { if (current) URL.revokeObjectURL(current); return ""; }); change("logoUrl", null); change("logoPublicId", null); }}>Remove image</button>}{busy && logoFile && <small className="upload-progress-label">Uploading logo… {uploadProgress}%</small>}</div>
            </div>
            <div className="status-control">
              <div><strong>Menu is active</strong><p>Guests with your QR code can view this menu.</p></div>
              <button type="button" role="switch" aria-checked={form.active} className={`switch${form.active ? " on" : ""}`} onClick={() => change("active", !form.active)}><span /></button>
            </div>
          </section>
        </div>
        <aside className="editor-aside">
          <div className="admin-panel publish-card"><span className="publish-dot" /><strong>{form.active ? "Menu active" : "Menu inactive"}</strong><p>{form.active ? "Your menu is visible to anyone with the link." : "The public menu is hidden until activated."}</p><div className="publish-rule" /><div className="slug-preview"><small>PUBLIC MENU LINK</small><span>/cafe/{form.slug || "your-cafe"}</span></div></div>
          <div className="form-actions"><Button type="submit" disabled={busy}>{busy ? logoFile ? `Uploading… ${uploadProgress}%` : "Saving…" : editing ? "Save changes" : "Create cafe"}</Button><Link to={editing ? `/admin/cafes/${cafeId}` : "/admin"} className="cancel-link">Cancel</Link></div>
        </aside>
      </form>
    </>
  );
}
