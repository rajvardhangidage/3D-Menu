import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchMenu } from "../api/menu";
import type { CafeMenu, MenuItem } from "../api/types";

const SpatialAtmosphere = lazy(() => import("../components/SpatialAtmosphere"));

type MenuCardItem = MenuItem & { categoryName: string; categoryIndex: number };

function formatPrice(value: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currencyCode} ${value.toFixed(2)}`;
  }
}

function LoadingExperience() {
  return <main className="experience-state"><span className="experience-loader" /><p>Setting the table…</p></main>;
}

function ErrorExperience({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main className="experience-state error-experience">
      <span className="error-orbit">!</span>
      <p className="experience-eyebrow">A LITTLE PAUSE</p>
      <h1>This menu is out of reach.</h1>
      <p>{message}</p>
      <button className="experience-outline-button" onClick={onRetry}>Try again</button>
    </main>
  );
}

function FoodCard({ item, currencyCode, index, count, onNext, onPrevious, onDetails }: {
  item: MenuCardItem; currencyCode: string; index: number; count: number;
  onNext: () => void; onPrevious: () => void; onDetails: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const dragX = useMotionValue(0);
  const imageX = useTransform(dragX, [-180, 0, 180], [16, 0, -16]);
  function onDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number }; velocity: { x: number } }) {
    if (info.offset.x < -50 || info.velocity.x < -450) onNext();
    else if (info.offset.x > 50 || info.velocity.x > 450) onPrevious();
  }

  return (
    <motion.article
      className="spatial-card"
      initial={reducedMotion ? false : { opacity: 0, y: 30, scale: 0.92, rotateY: -7 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotateY: 0 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.94, rotateY: 5 }}
      transition={{ duration: 0.42, ease: [0.2, 0.75, 0.2, 1] }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.18}
      style={{ x: dragX, touchAction: "pan-y" }}
      onDragEnd={onDragEnd}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") onNext();
        if (event.key === "ArrowLeft") onPrevious();
      }}
      tabIndex={0}
      aria-label={`${item.name}, ${formatPrice(item.fullPrice, currencyCode)}. Swipe or use arrow keys to browse.`}
    >
      <div className="card-glass-shine" />
      <button className="food-photo-frame" type="button" onClick={onDetails} aria-label={`View ${item.name} details`}>
        {item.imageUrl ? (
          <motion.img
            src={item.imageUrl}
            alt={item.name}
            loading={index < 2 ? "eager" : "lazy"}
            decoding="async"
            style={{ x: imageX }}
          />
        ) : (
          <div className={`food-image-fallback food-fallback-${index % 5}`}>
            <span className="fallback-dish" />
            <span className="fallback-herb fallback-herb-one" />
            <span className="fallback-herb fallback-herb-two" />
          </div>
        )}
        <span className="image-corner-label">FRESHLY PREPARED</span>
        <span className="image-view-hint">Tap to discover ↗</span>
      </button>
      <div className="spatial-card-info">
        <div className="card-category">{item.categoryName}<span>·</span><span>{String(item.displayOrder + 1).padStart(2, "0")}</span></div>
        <button className="card-title-button" onClick={onDetails}><h2>{item.name}</h2><span>↗</span></button>
        {item.description && <p className="spatial-card-description">{item.description}</p>}
        <div className="card-bottom-row">
          <div className="spatial-prices">
            {item.halfPrice !== null && <span><small>HALF</small>{formatPrice(item.halfPrice, currencyCode)}</span>}
            <span><small>{item.halfPrice !== null ? "FULL" : "PRICE"}</small>{formatPrice(item.fullPrice, currencyCode)}</span>
          </div>
          <span className="card-index">{String(index + 1).padStart(2, "0")} <i>/</i> {String(count).padStart(2, "0")}</span>
        </div>
      </div>
      <span className="card-edge-light" />
    </motion.article>
  );
}

function ItemDetails({ item, currencyCode, onClose }: { item: MenuCardItem; currencyCode: string; onClose: () => void }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div className="item-detail-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <motion.section
        className="item-detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-detail-title"
        initial={reducedMotion ? false : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 15, scale: 0.98 }}
        transition={{ duration: 0.25 }}
      >
        <button className="detail-close" onClick={onClose} aria-label="Close item details">×</button>
        <div className="detail-image">
          {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <div className={`food-image-fallback food-fallback-${item.categoryIndex % 5}`}><span className="fallback-dish" /><span className="fallback-herb fallback-herb-one" /><span className="fallback-herb fallback-herb-two" /></div>}
          <span className="detail-image-glow" />
        </div>
        <div className="detail-copy">
          <span className="card-category">{item.categoryName}<span>·</span> A HOUSE FAVOURITE</span>
          <h2 id="item-detail-title">{item.name}</h2>
          <p>{item.description || "Thoughtfully prepared with fresh, seasonal ingredients."}</p>
          <div className="detail-price-row">
            {item.halfPrice !== null && <div><small>HALF</small><strong>{formatPrice(item.halfPrice, currencyCode)}</strong></div>}
            <div><small>{item.halfPrice !== null ? "FULL" : "PRICE"}</small><strong>{formatPrice(item.fullPrice, currencyCode)}</strong></div>
          </div>
          <span className="detail-note">PREPARED FRESH · MADE WITH CARE</span>
        </div>
      </motion.section>
    </motion.div>
  );
}

export default function CafeExperiencePage() {
  const { slug = "" } = useParams();
  const [menu, setMenu] = useState<CafeMenu | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [entered, setEntered] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [itemIndex, setItemIndex] = useState(0);
  const [detailItem, setDetailItem] = useState<MenuCardItem | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const reducedMotion = useReducedMotion();

  const loadMenu = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchMenu(slug);
      setMenu(result);
      const firstCategory = [...result.categories].sort((a, b) => a.displayOrder - b.displayOrder)[0];
      setCategoryId(firstCategory?.id ?? "");
      setItemIndex(0);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't load this cafe menu.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    const controller = new AbortController();
    setMenu(null);
    setLoading(true);
    setError("");
    setEntered(false);
    setCategoryId("");
    setDetailItem(null);
    fetchMenu(slug, controller.signal).then((result) => {
      setMenu(result);
      const firstCategory = [...result.categories].sort((a, b) => a.displayOrder - b.displayOrder)[0];
      setCategoryId(firstCategory?.id ?? "");
      setItemIndex(0);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "We couldn't load this cafe menu.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [loadMenu]);

  const categories = useMemo(
    () => [...(menu?.categories ?? [])].sort((a, b) => a.displayOrder - b.displayOrder),
    [menu],
  );
  const activeCategory = categories.find((category) => category.id === categoryId) ?? null;
  const categoryItems = useMemo(
    () => (activeCategory?.items ?? []).filter((item) => item.available).sort((a, b) => a.displayOrder - b.displayOrder),
    [activeCategory],
  );
  const cardItems = useMemo(
    () => categoryItems.map((item) => ({ ...item, categoryName: activeCategory?.name ?? "", categoryIndex: Math.max(0, categories.findIndex((category) => category.id === categoryId)) })),
    [activeCategory?.name, categories, categoryId, categoryItems],
  );

  useEffect(() => {
    setItemIndex((current) => Math.min(current, Math.max(0, cardItems.length - 1)));
  }, [cardItems.length, categoryId]);

  const changeCategory = (nextId: string) => {
    setCategoryId(nextId);
    setItemIndex(0);
    setShowAllCategories(false);
  };
  const nextItem = () => setItemIndex((current) => (current + 1) % Math.max(cardItems.length, 1));
  const previousItem = () => setItemIndex((current) => (current - 1 + cardItems.length) % Math.max(cardItems.length, 1));
  const currentItem = cardItems[itemIndex] ?? null;

  if (loading) return <LoadingExperience />;
  if (error || !menu) return <ErrorExperience message={error || "This cafe menu is unavailable."} onRetry={() => void loadMenu()} />;

  return (
    <main className={`cafe-experience${entered ? " menu-is-open" : ""}`}>
      <Suspense fallback={null}><SpatialAtmosphere /></Suspense>
      <div className="experience-grain" />
      <header className="experience-header">
        <Link to={`/cafe/${menu.slug}`} className="experience-brand" aria-label={`${menu.name} menu`}>
          {menu.logoUrl ? <img src={menu.logoUrl} alt="" /> : <span className="brand-monogram">{menu.name.charAt(0).toUpperCase()}</span>}
          <span><strong>{menu.name}</strong><small>AN EXPERIENCE BY THE TABLE</small></span>
        </Link>
        <span className="header-coordinate">EST. WITH CARE&nbsp; / &nbsp;{String(categories.length).padStart(2, "0")} SECTIONS</span>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        {!entered ? (
          <motion.section
            className="welcome-scene"
            key="welcome"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.45 }}
          >
            <div className="welcome-orbit welcome-orbit-one" />
            <div className="welcome-orbit welcome-orbit-two" />
            <div className="welcome-content">
              <motion.div className="welcome-portrait" initial={reducedMotion ? false : { scale: 0.86, rotate: -7 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 0.85, ease: [0.2, 0.75, 0.2, 1] }}>
                {menu.logoUrl ? <img src={menu.logoUrl} alt={`${menu.name} logo`} /> : (
                  <>
                    {menu.categories.flatMap((category) => category.items).find((item) => item.available && item.imageUrl)?.imageUrl
                      ? <img src={menu.categories.flatMap((category) => category.items).find((item) => item.available && item.imageUrl)?.imageUrl ?? ""} alt="" />
                      : <div className="welcome-portrait-fallback"><span>{menu.name.charAt(0).toUpperCase()}</span><i /><b /></div>}
                  </>
                )}
                <span className="portrait-ring" />
              </motion.div>
              <p className="experience-eyebrow"><span className="welcome-live-dot" /> YOUR TABLE IS READY</p>
              <h1>Welcome to<br /><em>{menu.name}</em></h1>
              <p className="welcome-description">{menu.description || "A thoughtful menu, made for a moment worth savouring."}</p>
              {menu.address && <div className="welcome-location"><span>⌖</span>{menu.address}</div>}
              <button className="explore-button" onClick={() => setEntered(true)}>Explore the menu <span>↗</span></button>
              <span className="welcome-footnote">MADE FRESH · SERVED WITH CARE</span>
            </div>
          </motion.section>
        ) : (
          <motion.section
            className="spatial-menu"
            key="menu"
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.45 }}
          >
            <div className="menu-stage-heading">
              <div><span className="experience-eyebrow">A TABLE OF GOOD THINGS</span><h1>Explore <em>the menu.</em></h1></div>
              <span className="menu-stage-note">SWIPE TO WANDER <span>↔</span></span>
            </div>

            <nav className="spatial-category-nav" aria-label="Menu categories">
              <div className="category-chip-row">
                {categories.map((category, index) => (
                  <button
                    className={`spatial-category-chip${category.id === categoryId ? " selected" : ""}`}
                    key={category.id}
                    onClick={() => changeCategory(category.id)}
                  ><small>{String(index + 1).padStart(2, "0")}</small>{category.name}</button>
                ))}
              </div>
              {categories.length > 3 && <button className="category-expand" onClick={() => setShowAllCategories(!showAllCategories)} aria-expanded={showAllCategories}>{showAllCategories ? "Less" : "All sections"} <span>{showAllCategories ? "↑" : "⌄"}</span></button>}
              {showAllCategories && <div className="category-expansion">{categories.map((category) => <button key={category.id} onClick={() => changeCategory(category.id)}>{category.name}<span>{String(category.items.filter((item) => item.available).length).padStart(2, "0")}</span></button>)}</div>}
            </nav>

            <div className="card-stage">
              {cardItems.length > 1 && <div className="card-backplate card-backplate-left" aria-hidden="true" />}
              {cardItems.length > 2 && <div className="card-backplate card-backplate-right" aria-hidden="true" />}
              {currentItem ? (
                <AnimatePresence mode="wait" initial={false}>
                  <FoodCard
                    key={currentItem.id}
                    item={currentItem}
                    currencyCode={menu.currencyCode}
                    index={itemIndex}
                    count={cardItems.length}
                    onNext={nextItem}
                    onPrevious={previousItem}
                    onDetails={() => setDetailItem(currentItem)}
                  />
                </AnimatePresence>
              ) : (
                <div className="empty-spatial-menu"><span className="empty-orbit">✳</span><h2>A little quiet here.</h2><p>No available items in this section right now.</p></div>
              )}
              {cardItems.length > 1 && <div className="carousel-controls">
                <button onClick={previousItem} aria-label="Previous menu item">←</button>
                <div>{cardItems.map((item, index) => <button key={item.id} className={index === itemIndex ? "active" : ""} onClick={() => setItemIndex(index)} aria-label={`Show ${item.name}`} />)}</div>
                <button onClick={nextItem} aria-label="Next menu item">→</button>
              </div>}
            </div>

            <div className="spatial-menu-footer">
              <button className="welcome-back-button" onClick={() => setEntered(false)}>← <span>Back to {menu.name}</span></button>
              <span>THOUGHTFULLY MADE&nbsp; · &nbsp;MEANT TO BE ENJOYED</span>
              {menu.phone && <a href={`tel:${menu.phone}`}>Call the cafe ↗</a>}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <footer className="experience-bottomline"><span>{menu.name.toUpperCase()}</span><i /> <span>AN IMMERSIVE MENU EXPERIENCE</span></footer>
      <AnimatePresence>{detailItem && <ItemDetails item={detailItem} currencyCode={menu.currencyCode} onClose={() => setDetailItem(null)} />}</AnimatePresence>
    </main>
  );
}
