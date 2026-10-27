import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCafes, type Cafe } from "../../api/admin";
import { useAuth } from "../../auth/AuthContext";
import { Button, EmptyState, ErrorState, LoadingState, PageHeader } from "../../components/admin/Ui";

export default function CafeListPage() {
  const { token } = useAuth();
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const result = await getCafes(token, page);
      setCafes(result.content);
      setTotal(result.totalElements);
      setTotalPages(result.totalPages);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load cafes.");
    } finally {
      setLoading(false);
    }
  }, [page, token]);
  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <PageHeader eyebrow="WORKSPACE / CAFES" title="Cafes" description="Manage the restaurants and their customer-facing menus."
        action={<Link to="/admin/cafes/new"><Button type="button"><span>＋</span> Add cafe</Button></Link>} />
      <div className="overview-row">
        <div className="overview-card"><span className="overview-icon">⌂</span><div><small>ALL CAFES</small><strong>{loading ? "—" : total}</strong></div></div>
        <div className="overview-note"><span className="note-dot" /> Menu pages are public to guests. Only platform admins can make changes.</div>
      </div>
      <section className="admin-panel">
        <div className="panel-heading"><div><h2>Your cafes</h2><p>{total} {total === 1 ? "location" : "locations"} on the platform</p></div>{!loading && <button className="refresh-button" onClick={() => void load()} aria-label="Refresh cafes">↻</button>}</div>
        {loading ? <LoadingState label="Loading cafes…" /> : error ? <ErrorState message={error} retry={() => void load()} /> : cafes.length === 0 ? (
          <EmptyState title="No cafes yet" description="Add your first cafe to start building its menu." action={<Link to="/admin/cafes/new"><Button type="button">Add your first cafe</Button></Link>} />
        ) : (
          <div className="table-scroll">
            <table className="admin-table"><thead><tr><th>CAFE</th><th>MENU URL</th><th>STATUS</th><th>UPDATED</th><th /></tr></thead>
              <tbody>{cafes.map((cafe) => (
                <tr key={cafe.id}>
                  <td><Link to={`/admin/cafes/${cafe.id}`} className="cafe-cell">
                    <span className="cafe-thumb">{cafe.logoUrl ? <img src={cafe.logoUrl} alt="" /> : <span>{cafe.name.charAt(0).toUpperCase()}</span>}</span>
                    <span><strong>{cafe.name}</strong><small>{cafe.address || "No address added"}</small></span>
                  </Link></td>
                  <td><span className="slug-text">/cafe/{cafe.slug}</span></td>
                  <td><span className={`status-pill${cafe.active ? " active" : " inactive"}`}><i />{cafe.active ? "Active" : "Inactive"}</span></td>
                  <td className="date-cell">{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(cafe.updatedAt))}</td>
                  <td><Link className="row-arrow" to={`/admin/cafes/${cafe.id}`} aria-label={`Manage ${cafe.name}`}>↗</Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {!loading && !error && totalPages > 1 && <div className="pagination">
          <span>Page {page + 1} of {totalPages}</span>
          <div><button disabled={page === 0} onClick={() => setPage((current) => current - 1)}>← Previous</button><button disabled={page + 1 >= totalPages} onClick={() => setPage((current) => current + 1)}>Next →</button></div>
        </div>}
      </section>
      <div className="admin-footer-note">IMMERSIVE MENU <span>·</span> PLATFORM ADMINISTRATION</div>
    </>
  );
}
