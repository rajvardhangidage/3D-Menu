import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchMenu } from "../api/menu";
import type { CafeMenu, MenuItem } from "../api/types";

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
      initial={reducedMotion ? false : { opacity: 0, y: 22, scale: 0.94, rotateY: -5, z: -30 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotateY: 0, z: 34 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.96, rotateY: 4, z: -30 }}
      transition={{ type: "spring", stiffness: 190, damping: 24, mass: 0.8 }}
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
        <span className="image-corner-label">{item.categoryName}</span>
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

function DishEcho({ item, position, onSelect }: { item: MenuCardItem; position: number; onSelect: () => void }) {
  return (
    <button
      className={`dish-echo dish-echo-${position}`}
      type="button"
      onClick={onSelect}
      aria-label={`Show ${item.name}`}
      style={{ zIndex: 3 - position }}
    >
      {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <span className={`food-image-fallback food-fallback-${item.categoryIndex % 5}`}><i className="fallback-dish" /></span>}
      <span className="dish-echo-caption">{item.name}</span>
    </button>
  );
}

export default function CafeExperiencePage() {
  const { slug = "" } = useParams();
  const [menu, setMenu] = useState<CafeMenu | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [categoryId, setCategoryId] = useState("");
  const [itemIndex, setItemIndex] = useState(0);
  const [detailItem, setDetailItem] = useState<MenuCardItem | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [motionError, setMotionError] = useState("");
  const cameraRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sceneRef = useRef<HTMLElement>(null);
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

  useEffect(() => {
    if (!motionEnabled) return;
    const handleOrientation = (event: DeviceOrientationEvent) => {
      const scene = sceneRef.current;
      if (!scene || reducedMotion) return;
      const tiltX = Math.max(-8, Math.min(8, (event.gamma ?? 0) * 0.22));
      const tiltY = Math.max(-6, Math.min(6, ((event.beta ?? 0) - 35) * -0.12));
      scene.style.setProperty("--tilt-x", `${tiltY}deg`);
      scene.style.setProperty("--tilt-y", `${tiltX}deg`);
    };
    window.addEventListener("deviceorientation", handleOrientation);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, [motionEnabled, reducedMotion]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

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
  const echoes = cardItems.length > 1
    ? [1, 2, 3].map((distance) => cardItems[(itemIndex + distance) % cardItems.length]).filter((item, index, items) => item && item.id !== currentItem?.id && items.findIndex((candidate) => candidate.id === item.id) === index).slice(0, 3)
    : [];

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (motionEnabled || reducedMotion || event.pointerType !== "mouse" || !sceneRef.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    sceneRef.current.style.setProperty("--tilt-x", `${((event.clientY - bounds.top) / bounds.height - 0.5) * -3}deg`);
    sceneRef.current.style.setProperty("--tilt-y", `${((event.clientX - bounds.left) / bounds.width - 0.5) * 4}deg`);
  };

  const toggleMotion = async () => {
    const orientationType = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };
    setMotionError("");
    try {
      if (orientationType && typeof orientationType.requestPermission === "function") {
        const permission = await orientationType.requestPermission();
        setMotionEnabled(permission === "granted");
        if (permission !== "granted") setMotionError("Motion access was not enabled; the menu will stay steady.");
        return;
      }
      if (orientationType) {
        setMotionEnabled(true);
        return;
      }
      setMotionError("Motion sensors are unavailable; the menu will stay steady.");
    } catch (cause) {
      setMotionError(cause instanceof Error ? cause.message : "Motion access could not be enabled.");
    }
  };

  const toggleCamera = async () => {
    setCameraError("");
    if (cameraActive) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (cameraRef.current) cameraRef.current.srcObject = null;
      setCameraActive(false);
      return;
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera access is not available in this browser.");
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      if (cameraRef.current) {
        cameraRef.current.srcObject = stream;
        await cameraRef.current.play();
      }
      setCameraActive(true);
    } catch (cause) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraError(cause instanceof Error ? cause.message : "Camera access could not be started.");
    }
  };

  if (loading) return <LoadingExperience />;
  if (error || !menu) return <ErrorExperience message={error || "This cafe menu is unavailable."} onRetry={() => void loadMenu()} />;

  return (
    <main className="cafe-experience" ref={sceneRef} onPointerMove={handlePointerMove}>
      <div className="restaurant-backdrop" aria-hidden="true" />
      <video ref={cameraRef} className={`camera-backdrop${cameraActive ? " camera-backdrop-active" : ""}`} autoPlay playsInline muted aria-hidden="true" />
      <div className="environment-shade" aria-hidden="true" />
      <div className="experience-grain" aria-hidden="true" />

      <div className="scene-ambient-label" aria-hidden="true"><span /> {cameraActive ? "YOUR SPACE · LIVE" : "A MENU IN YOUR SPACE"}</div>

      <section className="spatial-menu-window" aria-label={`${menu.name} menu`}>
        <header className="window-header">
          <div className="window-identity">
            {menu.logoUrl ? <img src={menu.logoUrl} alt="" /> : <span className="brand-monogram">{menu.name.charAt(0).toUpperCase()}</span>}
            <span><strong>{menu.name}</strong><small>{menu.address || "A table set just for you"}</small></span>
          </div>
          <div className="window-tools">
            {menu.phone && <a className="environment-control phone-control" href={`tel:${menu.phone}`}>Call the cafe</a>}
            <button type="button" className={`environment-control${cameraActive ? " control-active" : ""}`} onClick={() => void toggleCamera()} aria-pressed={cameraActive}>
              <span className="camera-icon" aria-hidden="true" />{cameraActive ? "Camera live" : "Use camera"}
            </button>
            <button type="button" className={`motion-control${motionEnabled ? " control-active" : ""}`} onClick={() => void toggleMotion()} aria-pressed={motionEnabled} aria-label={motionEnabled ? "Disable motion parallax" : "Enable motion parallax"}>
              <span aria-hidden="true">⌁</span>
            </button>
          </div>
        </header>

        <div className="window-intro">
          <div><span className="window-kicker"><i /> {menu.description || "MADE WITH CARE, SERVED IN GOOD COMPANY"}</span><h1>Something <em>delicious.</em></h1></div>
          <span className="window-category-count">{String(categories.length).padStart(2, "0")} <small>COLLECTIONS</small></span>
        </div>

        <nav className="spatial-category-nav" aria-label="Menu categories">
          <button type="button" className="category-back-control" aria-label="Previous category" onClick={() => {
            const currentIndex = categories.findIndex((category) => category.id === categoryId);
            changeCategory(categories[(currentIndex - 1 + categories.length) % Math.max(categories.length, 1)]?.id ?? "");
          }}>‹</button>
          <div className="category-chip-row">
            {categories.map((category, index) => (
              <button
                className={`spatial-category-chip${category.id === categoryId ? " selected" : ""}`}
                key={category.id}
                onClick={() => changeCategory(category.id)}
                aria-pressed={category.id === categoryId}
              ><small>{String(index + 1).padStart(2, "0")}</small>{category.name}</button>
            ))}
          </div>
          {categories.length > 3 && <button className="category-expand" onClick={() => setShowAllCategories(!showAllCategories)} aria-expanded={showAllCategories}>{showAllCategories ? "Close" : "All"}<span>{showAllCategories ? "×" : "⌄"}</span></button>}
          {showAllCategories && <div className="category-expansion">{categories.map((category) => <button key={category.id} onClick={() => changeCategory(category.id)}>{category.name}<span>{String(category.items.filter((item) => item.available).length).padStart(2, "0")}</span></button>)}</div>}
        </nav>

        <div className="window-content">
          <div className="dish-gallery">
            {echoes.map((item, index) => <DishEcho key={item.id} item={item} position={index + 1} onSelect={() => setItemIndex(cardItems.findIndex((candidate) => candidate.id === item.id))} />)}
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
          </div>
          <div className="window-navigation">
            <button type="button" className="window-back" onClick={() => {
              const currentIndex = categories.findIndex((category) => category.id === categoryId);
              changeCategory(categories[Math.max(0, currentIndex - 1)]?.id ?? "");
            }}><span aria-hidden="true">←</span> BACK</button>
            {cardItems.length > 1 && <div className="carousel-controls">
              <button onClick={previousItem} aria-label="Previous menu item">←</button>
              <div>{cardItems.map((item, index) => <button key={item.id} className={index === itemIndex ? "active" : ""} onClick={() => setItemIndex(index)} aria-label={`Show ${item.name}`} />)}</div>
              <button onClick={nextItem} aria-label="Next menu item">→</button>
            </div>}
            <div className="window-nav-note"><span>SWIPE TO EXPLORE</span><i>↔</i></div>
          </div>
        </div>
        {(cameraError || motionError) && <p className="camera-error" role="status">{cameraError || motionError}</p>}
      </section>

      <footer className="experience-bottomline"><span>DRAG OR SWIPE TO WANDER</span><i /><span>{menu.name.toUpperCase()}</span></footer>
      <AnimatePresence>{detailItem && <ItemDetails item={detailItem} currencyCode={menu.currencyCode} onClose={() => setDetailItem(null)} />}</AnimatePresence>
    </main>
  );
}
