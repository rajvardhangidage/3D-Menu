import type { ButtonHTMLAttributes, ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, action }: {
  eyebrow?: string; title: string; description?: string; action?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>{eyebrow && <div className="page-eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  );
}

export function Button({ variant = "primary", className = "", children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "quiet" }) {
  return <button className={`admin-button ${variant} ${className}`} {...props}>{children}</button>;
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return <div className="admin-state"><span className="admin-spinner" />{label}</div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="admin-error"><span className="error-symbol">!</span><div><strong>Something went wrong</strong><p>{message}</p>{retry && <button className="inline-action" onClick={retry}>Try again</button>}</div></div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="admin-empty"><span className="empty-icon">⌑</span><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function Modal({ title, description, onClose, children, wide = false }: {
  title: string; description?: string; onClose: () => void; children: ReactNode; wide?: boolean;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`admin-modal${wide ? " wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header><div><h2 id="modal-title">{title}</h2>{description && <p>{description}</p>}</div><button className="modal-close" type="button" onClick={onClose} aria-label="Close dialog">×</button></header>
        {children}
      </section>
    </div>
  );
}

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return <label className={`form-field ${className}`}><span className="field-label">{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function ConfirmDelete({ title, description, onCancel, onConfirm, busy = false, error }: {
  title: string; description: string; onCancel: () => void; onConfirm: () => void; busy?: boolean; error?: string;
}) {
  return <Modal title={title} description={description} onClose={onCancel}>
    {error && <div className="form-error modal-inline-error" role="alert">{error}</div>}
    <div className="modal-actions"><Button variant="secondary" type="button" onClick={onCancel} disabled={busy}>Cancel</Button><Button variant="danger" type="button" onClick={onConfirm} disabled={busy}>{busy ? "Deleting…" : "Delete"}</Button></div>
  </Modal>;
}
