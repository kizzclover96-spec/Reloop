import React, { useState, useEffect } from "react";
import {
  Search,
  Heart,
  ChevronLeft,
  ChevronDown,
  Camera,
  Sparkles,
  SlidersHorizontal,
  X,
  Check,
  Bell,
  Shirt,
  Grid3x3,
  Glasses,
  AlertCircle,
} from "lucide-react";
import { COLOR, SERIF, SANS, cssBackground } from "./theme";
import { useAuth } from "./context/AuthContext";
import {
  useListings,
  useUserListings,
  createListing,
  seedListingsIfEmpty,
  uploadListingPhoto,
  newListingId,
  MAX_PHOTOS_PER_LISTING,
  MAX_ACTIVE_LISTINGS_PER_USER,
} from "./data/listings";
import { logRecentlyViewed } from "./data/localStore";
import { GIVEAWAY_PRICE_EUR, buyerPrice } from "./utils/price";
import { PACKAGE_SIZES, shippingCostFor } from "./utils/shipping";
import { useLanguage } from "./i18n/LanguageContext";
import LanguageSwitcher from "./i18n/LanguageSwitcher";
import ProductView from "./ProductView";
import ProfileScreen from "./ProfileScreen";
import LoginScreen from "./LoginScreen";
import AddressSetup from "./AddressSetup";
import { useUserAddress } from "./data/address";
import SearchTabIcon from "./icons/SearchTabIcon";
import DiscoverTabIcon from "./icons/DiscoverTabIcon";
import ListTabIcon from "./icons/ListTabIcon";
import FavouritesTabIcon from "./icons/FavouritesTabIcon";
import ProfileTabIcon from "./icons/ProfileTabIcon";
import { DressIcon, SneakerIcon, JacketIcon, BagIcon, HeelsIcon, PantsIcon } from "./icons/ClothingIcons";

const FONT_LINK = (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; }
    ::-webkit-scrollbar { display: none; }
    @keyframes heroFade { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
    @keyframes shimmer { 0% { background-position: -300% 0; } 100% { background-position: 300% 0; } }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `}</style>
);

const CATEGORIES = [
  { name: "Shop all", labelKey: "category.shopAll", Icon: Grid3x3 },
  { name: "Dresses", labelKey: "category.dresses", Icon: DressIcon },
  { name: "Tops", labelKey: "category.tops", Icon: Shirt },
  { name: "Bottoms", labelKey: "category.bottoms", Icon: PantsIcon },
  { name: "Footwear", labelKey: "category.footwear", Icon: SneakerIcon },
  { name: "Jackets", labelKey: "category.jackets", Icon: JacketIcon },
  { name: "Bags", labelKey: "category.bags", Icon: BagIcon },
  { name: "Accessories", labelKey: "category.accessories", Icon: Glasses },
];

// The real, selectable categories a seller can tag a listing with — everything
// in CATEGORIES except the "Shop all" shortcut, which isn't a real category.
const CATEGORY_OPTIONS = CATEGORIES.filter((c) => c.name !== "Shop all");

// Sellers pick from a fixed set of prices rather than typing any amount —
// keeps pricing simple and consistent across the catalog.
const PRICE_TIERS = [3, 6, 9, 12, 15, 20, 23, 25, 27, 29, 30];

// Rotates through the hero banner — 6 distinct clothing/shoe types, one swap every 3 minutes.
const HERO_ITEMS = [
  { name: "Dresses", Icon: DressIcon },
  { name: "Sneakers", Icon: SneakerIcon },
  { name: "Jackets", Icon: JacketIcon },
  { name: "Tops", Icon: Shirt },
  { name: "Bags", Icon: BagIcon },
  { name: "Heels", Icon: HeelsIcon },
];
const HERO_ROTATE_MS = 3 * 60 * 1000;

const fmt = (n) => `€${n.toLocaleString()}`;

/* ---------------------------------------------------------------
   Small shared bits
--------------------------------------------------------------- */
function Skeleton({ width = "100%", height = 16, radius = 6, style }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: `linear-gradient(90deg, ${COLOR.lineSoft} 25%, #f7f4ee 37%, ${COLOR.lineSoft} 63%)`,
        backgroundSize: "400% 100%",
        animation: "shimmer 1.4s ease infinite",
        ...style,
      }}
    />
  );
}

// Mirrors HomeScreen's actual layout so the app shows its real shape on first
// paint instead of a blank/spinner screen — same idea as YouTube's shimmer.
function HomeSkeleton() {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px 12px" }}>
        <Skeleton height={36} radius={20} />
      </div>
      <div style={{ padding: "0 18px" }}>
        <Skeleton height={118} radius={14} />
        <div style={{ marginTop: 10 }}>
          <Skeleton height={44} radius={10} />
        </div>
      </div>
      <div style={{ padding: "22px 18px 6px" }}>
        <Skeleton width={140} height={16} style={{ marginBottom: 14 }} />
        <div style={{ display: "flex", gap: 14 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <Skeleton width={54} height={54} radius={27} />
              <div style={{ marginTop: 6 }}>
                <Skeleton width={50} height={9} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "18px 18px 24px" }}>
        <Skeleton width={100} height={16} style={{ marginBottom: 14 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <Skeleton height={100} radius={10} />
              <div style={{ marginTop: 6 }}>
                <Skeleton width={60} height={9} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function Swatch({ gradient, size = "100%", radius = 10, ratio = "1 / 1", children }) {
  return (
    <div
      style={{
        background: cssBackground(gradient),
        width: size,
        aspectRatio: ratio,
        borderRadius: radius,
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(115deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 2px, transparent 2px, transparent 6px)",
        }}
      />
      {children}
    </div>
  );
}

function HeartButton({ active, onClick, size = 17 }) {
  const { t } = useLanguage();
  return (
    <button
      onClick={onClick}
      aria-label={active ? t("common.removeFromFavourites") : t("common.addToFavourites")}
      style={{
        background: "none",
        border: "none",
        padding: 4,
        cursor: "pointer",
        display: "flex",
        lineHeight: 0,
      }}
    >
      <Heart
        size={size}
        color={active ? COLOR.oxblood : COLOR.ink}
        fill={active ? COLOR.oxblood : "none"}
        strokeWidth={1.6}
      />
    </button>
  );
}

function TopBar({ title, onBack, right }) {
  const { t } = useLanguage();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 18px 12px",
        borderBottom: `0.5px solid ${COLOR.line}`,
      }}
    >
      <button
        onClick={onBack}
        style={{ background: "none", border: "none", padding: 0, cursor: onBack ? "pointer" : "default", visibility: onBack ? "visible" : "hidden" }}
        aria-label={t("product.back")}
      >
        <ChevronLeft size={22} color={COLOR.ink} />
      </button>
      <span style={{ fontFamily: SERIF, fontSize: 15, letterSpacing: "0.08em", fontWeight: 500, textTransform: "uppercase", color: COLOR.ink }}>
        {title}
      </span>
      <div style={{ width: 22 }}>{right}</div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Home
--------------------------------------------------------------- */
function HomeScreen({ listings, listingsLoading, favourites, toggleFav, goShop, onSelectProduct, onSearch }) {
  const { t } = useLanguage();
  const [heroIndex, setHeroIndex] = useState(0);
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex((i) => (i + 1) % HERO_ITEMS.length);
    }, HERO_ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  const HeroIcon = HERO_ITEMS[heroIndex].Icon;

  const submitSearch = (e) => {
    e.preventDefault();
    onSearch(searchInput);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px 12px" }}>
        <form
          onSubmit={submitSearch}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: COLOR.lineSoft,
            borderRadius: 20,
            padding: "9px 14px",
          }}
        >
          <button type="submit" style={{ background: "none", border: "none", padding: 0, display: "flex", cursor: "pointer" }} aria-label={t("home.searchPlaceholder")}>
            <Search size={15} color={COLOR.inkSoft} />
          </button>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("home.searchPlaceholder")}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              fontFamily: SANS,
              fontSize: 13,
              color: COLOR.ink,
            }}
          />
        </form>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <LanguageSwitcher />
          <Bell size={19} color={COLOR.ink} strokeWidth={1.6} />
        </div>
      </div>

      <div style={{ padding: "0 18px" }}>
        <div
          onClick={goShop}
          style={{
            background: "linear-gradient(120deg, #EFE6D6, #DCCDA9)",
            borderRadius: 14,
            padding: "22px 20px",
            cursor: "pointer",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <p style={{ fontFamily: SERIF, fontSize: 21, lineHeight: 1.15, margin: 0, color: COLOR.ink }}>
              {t("home.heroLine1")}
              <br />
              <em style={{ fontStyle: "italic" }}>{t("home.heroLine2")}</em>
            </p>
            <span
              style={{
                display: "inline-block",
                marginTop: 14,
                background: COLOR.card,
                fontFamily: SANS,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
                padding: "8px 16px",
                borderRadius: 3,
                color: COLOR.ink,
              }}
            >
              {t("home.explore")}
            </span>
          </div>
          <div
            key={heroIndex}
            style={{
              width: 74,
              height: 74,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              animation: "heroFade 0.9s ease",
            }}
          >
            <HeroIcon size={38} color={COLOR.ink} strokeWidth={1.4} />
          </div>
        </div>

        <button
          onClick={goShop}
          style={{
            width: "100%",
            marginTop: 10,
            background: COLOR.ink,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "13px",
            fontFamily: SANS,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.06em",
            cursor: "pointer",
          }}
        >
          {t("home.shopLatest")} &gt;
        </button>
      </div>

      <div style={{ padding: "22px 18px 6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <span style={{ fontFamily: SERIF, fontSize: 16, color: COLOR.ink }}>{t("home.featuredCategories")}</span>
          <button onClick={goShop} style={{ background: "none", border: "none", fontFamily: SANS, fontSize: 12, color: COLOR.oxblood, cursor: "pointer" }}>
            {t("home.seeAll")}
          </button>
        </div>
        <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 4 }}>
          {CATEGORIES.map(({ name, labelKey, Icon }) => (
            <button
              key={name}
              onClick={() => goShop(name === "Shop all" ? null : name)}
              style={{ background: "none", border: "none", cursor: "pointer", textAlign: "center", flexShrink: 0 }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 27,
                  background: COLOR.lineSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={24} color={COLOR.ink} strokeWidth={1.6} />
              </div>
              <div style={{ fontFamily: SANS, fontSize: 11, color: COLOR.ink, marginTop: 6, width: 60 }}>{t(labelKey)}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "18px 18px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <span style={{ fontFamily: SERIF, fontSize: 16, color: COLOR.ink }}>{t("home.watchlist")}</span>
          <span style={{ fontFamily: SANS, fontSize: 12, color: COLOR.oxblood }}>{t("home.seeAll")}</span>
        </div>
        {listingsLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <Skeleton height={100} radius={10} />
                <div style={{ marginTop: 6 }}>
                  <Skeleton width={60} height={9} />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <p style={{ fontFamily: SANS, fontSize: 12.5, color: COLOR.inkSoft }}>{t("home.noListings")}</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {listings.slice(0, 3).map((p) => (
              <div key={p.id}>
                <div style={{ position: "relative", cursor: "pointer" }} onClick={() => onSelectProduct(p.id)}>
                  <Swatch gradient={p.images[0]} radius={10} />
                  <div style={{ position: "absolute", top: 6, right: 6 }} onClick={(e) => e.stopPropagation()}>
                    <HeartButton active={favourites.has(p.id)} onClick={() => toggleFav(p.id)} size={15} />
                  </div>
                </div>
                <div style={{ fontFamily: SANS, fontSize: 12, color: COLOR.ink, marginTop: 6 }}>{p.seller.name}</div>
                <div style={{ fontFamily: SANS, fontSize: 12, color: COLOR.inkSoft }}>
                  €{buyerPrice(p)}
                  {!p.giveaway && p.was && (
                    <span style={{ textDecoration: "line-through", marginLeft: 5, color: "#B23A3A" }}>€{p.was}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Discover — masonry photo feed
--------------------------------------------------------------- */
function DiscoverScreen({ listings, onSelectProduct, onSeed, seeding, categoryFilter, setCategoryFilter, searchKeyword, setSearchKeyword, goList }) {
  const { t } = useLanguage();
  const [filterOpen, setFilterOpen] = useState(false);
  const [keywordInput, setKeywordInput] = useState(searchKeyword || "");

  useEffect(() => {
    setKeywordInput(searchKeyword || "");
    if (searchKeyword) setFilterOpen(true);
  }, [searchKeyword]);

  const categoryLabel = (name) => {
    const found = CATEGORIES.find((c) => c.name === name);
    return found ? t(found.labelKey) : name;
  };

  const kw = (searchKeyword || "").trim().toLowerCase();
  const matchesKeyword = (l) => {
    if (!kw) return true;
    const catLabel = categoryLabel(l.category || "").toLowerCase();
    return (
      (l.title || "").toLowerCase().includes(kw) ||
      (l.brand || "").toLowerCase().includes(kw) ||
      (l.description || "").toLowerCase().includes(kw) ||
      (l.category || "").toLowerCase().includes(kw) ||
      catLabel.includes(kw)
    );
  };

  const filtered = listings.filter((l) => (categoryFilter ? l.category === categoryFilter : true) && matchesKeyword(l));
  const isSparse = listings.length > 0 && (categoryFilter || kw) && filtered.length < 3;

  const applyKeyword = (e) => {
    e.preventDefault();
    setSearchKeyword(keywordInput);
  };

  const clearAll = () => {
    setCategoryFilter(null);
    setSearchKeyword("");
    setKeywordInput("");
  };

  return (
    <div style={{ position: "relative", minHeight: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px 12px",
        }}
      >
        <span style={{ width: 19 }} />
        <span style={{ fontFamily: SERIF, fontSize: 17, color: COLOR.ink }}>{t("discover.title")}</span>
        <Camera size={19} color={COLOR.ink} strokeWidth={1.6} />
      </div>

      {listings.length > 0 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 18px 14px" }}>
          {[{ name: "All", labelKey: "discover.all" }, ...CATEGORY_OPTIONS].map(({ name, labelKey }) => {
            const isActive = name === "All" ? !categoryFilter : categoryFilter === name;
            return (
              <button
                key={name}
                onClick={() => setCategoryFilter(name === "All" ? null : name)}
                style={{
                  flexShrink: 0,
                  background: isActive ? COLOR.ink : COLOR.lineSoft,
                  color: isActive ? "#fff" : COLOR.ink,
                  border: "none",
                  borderRadius: 20,
                  padding: "7px 14px",
                  fontFamily: SANS,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {t(labelKey)}
              </button>
            );
          })}
        </div>
      )}

      {filterOpen && listings.length > 0 && (
        <form onSubmit={applyKeyword} style={{ padding: "0 18px 14px", display: "flex", gap: 8 }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: COLOR.lineSoft,
              borderRadius: 20,
              padding: "8px 14px",
            }}
          >
            <Search size={13} color={COLOR.inkSoft} />
            <input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder={t("discover.searchPlaceholder")}
              style={{ flex: 1, background: "none", border: "none", outline: "none", fontFamily: SANS, fontSize: 12.5, color: COLOR.ink }}
              autoFocus
            />
            {keywordInput && (
              <button
                type="button"
                onClick={() => {
                  setKeywordInput("");
                  setSearchKeyword("");
                }}
                style={{ background: "none", border: "none", padding: 0, display: "flex", cursor: "pointer" }}
                aria-label={t("discover.clearFilter")}
              >
                <X size={13} color={COLOR.inkSoft} />
              </button>
            )}
          </div>
        </form>
      )}

      {listings.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center" }}>
          <p style={{ fontFamily: SERIF, fontSize: 17, color: COLOR.ink, marginBottom: 6 }}>{t("discover.emptyTitle")}</p>
          <p style={{ fontFamily: SANS, fontSize: 13, color: COLOR.inkSoft, marginBottom: 18 }}>
            {t("discover.emptySubtitle")}
          </p>
          <button
            onClick={onSeed}
            disabled={seeding}
            style={{
              background: COLOR.ink,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "11px 20px",
              fontFamily: SANS,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: seeding ? "default" : "pointer",
              opacity: seeding ? 0.6 : 1,
            }}
          >
            {seeding ? t("discover.loading") : t("discover.loadSample")}
          </button>
        </div>
      ) : (
        <>
          {isSparse && (
            <div style={{ margin: "0 18px 14px", padding: "14px", background: COLOR.lineSoft, borderRadius: 12, textAlign: "center" }}>
              <p style={{ fontFamily: SERIF, fontSize: 14.5, color: COLOR.ink, margin: "0 0 4px" }}>{t("discover.suggestionTitle")}</p>
              <p style={{ fontFamily: SANS, fontSize: 12, color: COLOR.inkSoft, margin: "0 0 10px" }}>{t("discover.suggestionSubtitle")}</p>
              <button
                onClick={goList}
                style={{
                  background: COLOR.ink,
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontFamily: SANS,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t("discover.suggestionCta")}
              </button>
            </div>
          )}

          {filtered.length === 0 ? (
            <div style={{ padding: "24px 24px 60px", textAlign: "center" }}>
              <button
                onClick={clearAll}
                style={{
                  background: "none",
                  border: `0.5px solid ${COLOR.line}`,
                  borderRadius: 10,
                  padding: "10px 18px",
                  fontFamily: SANS,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: COLOR.ink,
                  cursor: "pointer",
                }}
              >
                {t("discover.clearFilter")}
              </button>
            </div>
          ) : (
            <div style={{ padding: "0 12px 100px", columnCount: 2, columnGap: 8 }}>
              {filtered.map((p) => (
                <div
                  key={p.id}
                  style={{ breakInside: "avoid", marginBottom: 8, cursor: "pointer" }}
                  onClick={() => onSelectProduct(p.id)}
                >
                  <Swatch gradient={p.images[0]} size="100%" radius={14} ratio={p.ratio} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {listings.length > 0 && (
        <div
          style={{
            position: "sticky",
            bottom: 14,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <button
            onClick={() => setFilterOpen((v) => !v)}
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: COLOR.ink,
              color: "#fff",
              border: "none",
              borderRadius: 24,
              padding: "11px 20px",
              fontFamily: SANS,
              fontSize: 12.5,
              fontWeight: 600,
              letterSpacing: "0.02em",
              cursor: "pointer",
              boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
            }}
          >
            <SlidersHorizontal size={13} /> {t("discover.filter")}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   Favourites
--------------------------------------------------------------- */
function FavouritesScreen({ listings, favourites, toggleFav, onSelectProduct }) {
  const { t } = useLanguage();
  const [tab, setTab] = useState("listings");
  const tabs = [
    { key: "listings", labelKey: "favourites.tabListings" },
    { key: "searches", labelKey: "favourites.tabSearches" },
    { key: "brands", labelKey: "favourites.tabBrands" },
    { key: "sellers", labelKey: "favourites.tabSellers" },
  ];
  const activeTab = tabs.find((tb) => tb.key === tab);
  const favItems = listings.filter((p) => favourites.has(p.id));

  return (
    <div>
      <TopBar title={t("favourites.title")} />
      <div style={{ display: "flex", gap: 18, padding: "12px 18px", borderBottom: `0.5px solid ${COLOR.line}`, overflowX: "auto" }}>
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            style={{
              background: "none",
              border: "none",
              padding: "0 0 8px",
              fontFamily: SANS,
              fontSize: 13,
              fontWeight: tab === tb.key ? 600 : 400,
              color: tab === tb.key ? COLOR.ink : COLOR.inkSoft,
              borderBottom: tab === tb.key ? `2px solid ${COLOR.ink}` : "2px solid transparent",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {t(tb.labelKey)}
          </button>
        ))}
      </div>

      {tab !== "listings" ? (
        <div style={{ padding: "40px 24px", textAlign: "center" }}>
          <p style={{ fontFamily: SERIF, fontSize: 16, color: COLOR.ink, marginBottom: 6 }}>{t("favourites.emptyTabTitle")}</p>
          <p style={{ fontFamily: SANS, fontSize: 13, color: COLOR.inkSoft }}>
            {t("favourites.emptyTabSubtitle", { tab: t(activeTab.labelKey) })}
          </p>
        </div>
      ) : favItems.length === 0 ? (
        <div style={{ padding: "40px 24px", textAlign: "center" }}>
          <Heart size={26} color={COLOR.inkSoft} strokeWidth={1.4} />
          <p style={{ fontFamily: SERIF, fontSize: 16, color: COLOR.ink, margin: "12px 0 6px" }}>{t("favourites.emptyTitle")}</p>
          <p style={{ fontFamily: SANS, fontSize: 13, color: COLOR.inkSoft }}>{t("favourites.emptySubtitle")}</p>
        </div>
      ) : (
        <div>
          {favItems.map((it) => (
            <div
              key={it.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 18px",
                borderBottom: `0.5px solid ${COLOR.lineSoft}`,
                cursor: "pointer",
              }}
              onClick={() => onSelectProduct(it.id)}
            >
              <Swatch gradient={it.images[0]} size={58} radius={10} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: COLOR.ink }}>{it.brand}</div>
                <div style={{ fontFamily: SANS, fontSize: 12, color: COLOR.inkSoft }}>
                  {it.title}, {it.size}
                </div>
                <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: COLOR.ink, marginTop: 2 }}>{fmt(buyerPrice(it))}</div>
                <div style={{ fontFamily: SANS, fontSize: 11, color: COLOR.inkSoft }}>@{it.seller.name}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }} onClick={(e) => e.stopPropagation()}>
                <Bell size={15} color={COLOR.ink} strokeWidth={1.6} />
                <HeartButton active onClick={() => toggleFav(it.id)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   List an item
--------------------------------------------------------------- */
const AI_DESCRIPTIONS = [
  "Add your size here (e.g. EU 38, UK 10, M) — then: great condition, worn a handful of times, no flaws to note.",
  "Great condition, worn a handful of times. True to size with no flaws to note. Comes from a smoke-free, pet-free home.",
  "Barely worn — more like tried on and loved from afar. Fabric holds its shape well and there's no pilling or marks.",
  "Excellent pre-loved condition. Minor wear on the hem only, otherwise looks close to new. Fits true to size.",
  "Worn a few times, washed gently and hung to dry each time. True to size, no stains or damage.",
  "Good condition overall — a little soft from wash and wear, but no holes, stains, or pilling. Runs slightly small.",
  "Like new, only tried on at home. Tags may still be attached. Fits true to size, no flaws.",
  "Well loved but well cared for. Some light wear consistent with age, still plenty of life left. True to size.",
  "Excellent condition, smoke-free and pet-free home. Fits a touch large — would suit someone who likes an oversized fit.",
  "Gently worn, no visible flaws. Fabric still holds its shape and colour. True to size, fits as expected.",
  "Great staple piece, worn seasonally rather than daily. No stains or damage. Runs slightly large — size down if in doubt.",
  "Only worn once for a special occasion, dry cleaned after. Like new condition, true to size.",
  "Good everyday condition — soft from regular wear but no holes or major marks. Fits snug, would suit true to size or smaller.",
  "Excellent condition, kept in a garment bag. No pilling, no fading. True to size.",
  "Light wear on the cuffs only, otherwise excellent. Machine washed cold, always air dried. True to size.",
  "Great secondhand find — minor bobbling under the arms, not noticeable when worn. Fits true to size.",
  "Barely worn, bought in the wrong size originally. No flaws, tags removed but otherwise as new. Runs small.",
  "Solid everyday condition, some fading from wash but no holes or stains. True to size, comfortable fit.",
  "Excellent condition, worn maybe twice. No pilling, no marks. Fits true to size, would also work oversized.",
  "Good condition with light general wear. No major flaws. True to size — check the size chart if between sizes.",
];

function ListScreen({ user, listings }) {
  const { t } = useLanguage();
  const [uploads, setUploads] = useState([]); // { id, url?, uploading, error? }
  const [draftId, setDraftId] = useState(() => newListingId());
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(null);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [retail, setRetail] = useState("");
  const [selling, setSelling] = useState("");
  const [packageSize, setPackageSize] = useState(null);
  const [giveaway, setGiveaway] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const fileInputRef = React.useRef(null);

  const activeListingCount = listings.filter((l) => l.sellerId === user?.uid && l.status === "active").length;
  const atListingLimit = activeListingCount >= MAX_ACTIVE_LISTINGS_PER_USER;

  const useAI = () => {
    if (!desc.trim()) {
      setDesc(AI_DESCRIPTIONS[0]); // first suggestion always prompts for size
      return;
    }
    const rest = AI_DESCRIPTIONS.slice(1);
    setDesc(rest[Math.floor(Math.random() * rest.length)]);
  };

  const handleFiles = async (fileList) => {
    const room = MAX_PHOTOS_PER_LISTING - uploads.length;
    const files = Array.from(fileList).slice(0, room);
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      // Guard against enormous originals (e.g. 50MP raw photos) before we even
      // try to decode/compress them in the browser.
      if (file.size > 20 * 1024 * 1024) {
        setUploads((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, uploading: false, error: true }]);
        continue;
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setUploads((prev) => [...prev, { id, uploading: true }]);
      setFieldErrors((prev) => ({ ...prev, photos: false }));
      try {
        const url = await uploadListingPhoto(user.uid, draftId, file);
        setUploads((prev) => prev.map((u) => (u.id === id ? { id, url, uploading: false } : u)));
      } catch (err) {
        setUploads((prev) => prev.map((u) => (u.id === id ? { id, uploading: false, error: true } : u)));
      }
    }
  };

  const removeUpload = (id) => setUploads((prev) => prev.filter((u) => u.id !== id));

  const selectCategory = (name) => {
    setCategory(name);
    setCategoryPickerOpen(false);
    setFieldErrors((prev) => ({ ...prev, category: false }));
  };

  const selectPrice = (amount) => {
    setSelling(String(amount));
    setFieldErrors((prev) => ({ ...prev, price: false }));
  };

  const submit = async () => {
    if (atListingLimit) return setError(t("list.errorLimitReached", { limit: MAX_ACTIVE_LISTINGS_PER_USER }));

    const readyImages = uploads.filter((u) => u.url).map((u) => u.url);
    const errors = {};
    if (!title.trim()) errors.name = true;
    if (!category) errors.category = true;
    if (!giveaway && !selling) errors.price = true;
    if (!packageSize) errors.packageSize = true;
    if (readyImages.length === 0) errors.photos = true;
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      if (errors.name) return setError(t("list.errorName"));
      if (errors.category) return setError(t("list.errorCategory"));
      if (errors.price) return setError(t("list.errorPrice"));
      if (errors.packageSize) return setError(t("shipping.hintPackageSize"));
      if (errors.photos) return setError(t("list.errorPhoto"));
    }
    if (uploads.some((u) => u.uploading)) return setError(t("list.errorUploading"));

    setError("");
    setSubmitting(true);
    try {
      await createListing(
        draftId,
        {
          brand: "",
          title: title.trim(),
          category,
          size: "One size",
          location: "Stuttgart, DE",
          price: giveaway ? 0 : Number(selling),
          was: retail ? Number(retail) : undefined,
          condition: "Good condition",
          images: readyImages,
          ratio: "1 / 1",
          description: desc || undefined,
          giveaway,
          packageSize,
        },
        user.uid,
        { name: user.displayName || user.email?.split("@")[0] || "You", rating: 5, reviews: 0 }
      );
      setSubmitted(true);
      setTitle("");
      setCategory(null);
      setDesc("");
      setRetail("");
      setSelling("");
      setGiveaway(false);
      setPackageSize(null);
      setUploads([]);
      setFieldErrors({});
      setDraftId(newListingId());
      setTimeout(() => setSubmitted(false), 2200);
    } catch (err) {
      setError(err?.message || t("list.errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategory = CATEGORY_OPTIONS.find((c) => c.name === category);

  return (
    <div>
      <TopBar title={t("list.title")} />
      <div style={{ padding: "20px 18px 32px" }}>
        {atListingLimit && (
          <p
            style={{
              fontFamily: SANS,
              fontSize: 12,
              color: COLOR.oxblood,
              background: COLOR.oxbloodSoft,
              borderRadius: 8,
              padding: "10px 12px",
              marginBottom: 16,
            }}
          >
            {t("list.limitWarning", { limit: MAX_ACTIVE_LISTINGS_PER_USER })}
          </p>
        )}
        <p style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", color: COLOR.ink, marginBottom: 10, display: "flex", alignItems: "center" }}>
          {t("list.photos")}
          <FieldFlag show={fieldErrors.photos} hint={t("list.hintPhoto")} />
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div style={{ display: "flex", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
          {uploads.map((u) => (
            <div key={u.id} style={{ position: "relative", width: 64, height: 64 }}>
              {u.url ? (
                <Swatch gradient={u.url} size={64} radius={10} />
              ) : (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 10,
                    background: COLOR.lineSoft,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontFamily: SANS, fontSize: 10, color: u.error ? "#B23A3A" : COLOR.inkSoft, textAlign: "center", padding: "0 4px" }}>
                    {u.error ? t("list.failed") : t("list.uploading")}
                  </span>
                </div>
              )}
              <button
                onClick={() => removeUpload(u.id)}
                aria-label={t("list.removePhoto")}
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: COLOR.ink,
                  border: "none",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <X size={11} />
              </button>
            </div>
          ))}
          {uploads.length < MAX_PHOTOS_PER_LISTING && (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 64,
                height: 64,
                borderRadius: 10,
                border: `1px dashed ${fieldErrors.photos ? "#B23A3A" : COLOR.line}`,
                background: COLOR.lineSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              aria-label={t("list.addPhoto")}
            >
              <Camera size={18} color={COLOR.inkSoft} />
            </button>
          )}
        </div>
        <p style={{ fontFamily: SANS, fontSize: 11.5, color: COLOR.inkSoft, marginBottom: 24 }}>
          {t("list.photosHelp", { limit: MAX_PHOTOS_PER_LISTING })}
        </p>

        <p style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", color: COLOR.ink, marginBottom: 8, display: "flex", alignItems: "center" }}>
          {t("list.name")}
          <FieldFlag show={fieldErrors.name} hint={t("list.hintName")} />
        </p>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (e.target.value.trim()) setFieldErrors((prev) => ({ ...prev, name: false }));
          }}
          placeholder={t("list.namePlaceholder")}
          style={{
            width: "100%",
            border: `0.5px solid ${fieldErrors.name ? "#B23A3A" : COLOR.line}`,
            borderRadius: 10,
            padding: "12px 14px",
            fontFamily: SANS,
            fontSize: 13,
            color: COLOR.ink,
            marginBottom: 22,
          }}
        />

        <p style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", color: COLOR.ink, marginBottom: 10, display: "flex", alignItems: "center" }}>
          {t("list.category")}
          <FieldFlag show={fieldErrors.category} hint={t("list.hintCategory")} />
        </p>
        <button
          onClick={() => setCategoryPickerOpen((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: category ? COLOR.ink : COLOR.lineSoft,
            color: category ? "#fff" : COLOR.ink,
            border: fieldErrors.category ? "1px solid #B23A3A" : "none",
            borderRadius: 20,
            padding: "8px 13px",
            fontFamily: SANS,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: categoryPickerOpen ? 10 : 22,
          }}
        >
          {selectedCategory && <selectedCategory.Icon size={14} color="#fff" strokeWidth={1.8} />}
          {selectedCategory ? t(selectedCategory.labelKey) : t("list.selectCategory")}
          <ChevronDown size={13} style={{ transform: categoryPickerOpen ? "rotate(180deg)" : "none" }} />
        </button>
        {categoryPickerOpen && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
            {CATEGORY_OPTIONS.map(({ name, labelKey, Icon }) => {
              const isActive = category === name;
              return (
                <button
                  key={name}
                  onClick={() => selectCategory(name)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: isActive ? COLOR.ink : COLOR.lineSoft,
                    color: isActive ? "#fff" : COLOR.ink,
                    border: "none",
                    borderRadius: 20,
                    padding: "8px 13px",
                    fontFamily: SANS,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Icon size={14} color={isActive ? "#fff" : COLOR.ink} strokeWidth={1.8} />
                  {t(labelKey)}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <p style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", color: COLOR.ink, margin: 0 }}>
            {t("list.description")}
          </p>
          <button
            onClick={useAI}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: COLOR.oxbloodSoft,
              border: "none",
              borderRadius: 14,
              padding: "4px 9px",
              fontFamily: SANS,
              fontSize: 10.5,
              fontWeight: 600,
              color: COLOR.oxblood,
              cursor: "pointer",
            }}
          >
            <Sparkles size={11} /> {t("list.useAiDescription")}
            <span
              style={{
                background: COLOR.oxblood,
                color: "#fff",
                fontSize: 8,
                fontWeight: 700,
                padding: "1px 4px",
                borderRadius: 3,
                marginLeft: 1,
              }}
            >
              {t("list.beta")}
            </span>
          </button>
        </div>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder={t("list.descriptionPlaceholder")}
          rows={3}
          style={{
            width: "100%",
            border: `0.5px solid ${COLOR.line}`,
            borderRadius: 10,
            padding: "12px 14px",
            fontFamily: SANS,
            fontSize: 13,
            color: COLOR.ink,
            resize: "none",
            marginBottom: 24,
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 0",
            borderBottom: `0.5px solid ${COLOR.lineSoft}`,
            marginBottom: 4,
          }}
        >
          <div>
            <div style={{ fontFamily: SANS, fontSize: 13, color: COLOR.ink }}>{t("list.giveaway")}</div>
            <div style={{ fontFamily: SANS, fontSize: 11, color: COLOR.inkSoft, marginTop: 2 }}>{t("list.giveawayHint")}</div>
          </div>
          <button
            onClick={() => {
              const next = !giveaway;
              setGiveaway(next);
              if (next) {
                setSelling("");
                setFieldErrors((prev) => ({ ...prev, price: false }));
              }
            }}
            aria-label={t("list.giveaway")}
            style={{
              width: 40,
              height: 24,
              borderRadius: 12,
              border: "none",
              background: giveaway ? COLOR.ink : COLOR.lineSoft,
              position: "relative",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 3,
                left: giveaway ? 19 : 3,
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "#fff",
                transition: "left 0.15s ease",
                boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
              }}
            />
          </button>
        </div>

        <p style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", color: COLOR.ink, marginBottom: 8, display: "flex", alignItems: "center" }}>
          {t("list.pricing")}
          <FieldFlag show={fieldErrors.price} hint={t("list.hintPrice")} />
        </p>
        {!giveaway && (
          <p style={{ fontFamily: SANS, fontSize: 11, color: COLOR.inkSoft, marginBottom: 10 }}>{t("list.feeNote")}</p>
        )}
        {giveaway ? (
          <p style={{ fontFamily: SANS, fontSize: 12.5, color: COLOR.inkSoft, padding: "13px 0", borderBottom: `0.5px solid ${COLOR.lineSoft}` }}>
            {t("list.giveawayPricePreview", { price: GIVEAWAY_PRICE_EUR })}
          </p>
        ) : (
          <>
            <FieldRow label={t("list.retailPrice")} value={retail} onChange={setRetail} placeholder={t("list.optional")} />
            <div style={{ padding: "13px 0", borderBottom: `0.5px solid ${COLOR.lineSoft}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: selling ? 10 : 0 }}>
                <span style={{ fontFamily: SANS, fontSize: 13, color: COLOR.ink }}>{t("list.sellingPrice")}</span>
                {selling && <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: COLOR.ink }}>€{selling}</span>}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {PRICE_TIERS.map((p) => {
                  const isActive = selling === String(p);
                  return (
                    <button
                      key={p}
                      onClick={() => selectPrice(p)}
                      style={{
                        background: isActive ? COLOR.ink : COLOR.lineSoft,
                        color: isActive ? "#fff" : COLOR.ink,
                        border: fieldErrors.price ? "1px solid #B23A3A" : "none",
                        borderRadius: 16,
                        padding: "6px 12px",
                        fontFamily: SANS,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      €{p}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <p style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", color: COLOR.ink, margin: "22px 0 8px", display: "flex", alignItems: "center" }}>
          {t("shipping.packageSize")}
          <FieldFlag show={fieldErrors.packageSize} hint={t("shipping.hintPackageSize")} />
        </p>
        <p style={{ fontFamily: SANS, fontSize: 11.5, color: COLOR.inkSoft, marginBottom: 10 }}>
          {t("shipping.packageSizeHint")}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PACKAGE_SIZES.map(({ value, labelKey, exampleKey }) => {
            const isActive = packageSize === value;
            return (
              <button
                key={value}
                onClick={() => {
                  setPackageSize(value);
                  setFieldErrors((prev) => ({ ...prev, packageSize: false }));
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: isActive ? COLOR.ink : COLOR.lineSoft,
                  color: isActive ? "#fff" : COLOR.ink,
                  border: fieldErrors.packageSize ? "1px solid #B23A3A" : "none",
                  borderRadius: 10,
                  padding: "12px 14px",
                  fontFamily: SANS,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t(labelKey)}</div>
                  <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{t(exampleKey)}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>€{shippingCostFor(value)}</div>
              </button>
            );
          })}
        </div>

        {error && (
          <p style={{ fontFamily: SANS, fontSize: 12, color: "#B23A3A", marginTop: 14 }}>{error}</p>
        )}

        <button
          onClick={submit}
          disabled={submitting || atListingLimit}
          style={{
            width: "100%",
            marginTop: 24,
            background: submitted ? "#2E6B4F" : COLOR.ink,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "14px",
            fontFamily: SANS,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.04em",
            cursor: submitting ? "default" : "pointer",
            opacity: submitting ? 0.7 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {submitted ? (
            <>
              <Check size={15} /> {t("list.listed")}
            </>
          ) : submitting ? (
            t("list.submitting")
          ) : (
            t("list.submit")
          )}
        </button>
      </div>
    </div>
  );
}

function FieldFlag({ show, hint }) {
  if (!show) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 8, color: "#B23A3A" }}>
      <AlertCircle size={12} />
      <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 500 }}>{hint}</span>
    </span>
  );
}

function FieldRow({ label, value, onChange, placeholder, prefixDollar }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "13px 0",
        borderBottom: `0.5px solid ${COLOR.lineSoft}`,
      }}
    >
      <span style={{ fontFamily: SANS, fontSize: 13, color: COLOR.ink }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {prefixDollar && <span style={{ fontFamily: SANS, fontSize: 13, color: COLOR.inkSoft }}>€</span>}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder={placeholder}
          inputMode="decimal"
          style={{
            border: "none",
            textAlign: "right",
            width: 90,
            fontFamily: SANS,
            fontSize: 13,
            color: COLOR.ink,
            background: "none",
          }}
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Bottom nav + shell
--------------------------------------------------------------- */
const TABS = [
  { key: "home", labelKey: "nav.home", Icon: SearchTabIcon },
  { key: "shop", labelKey: "nav.discover", Icon: DiscoverTabIcon },
  { key: "list", labelKey: "nav.list", Icon: ListTabIcon },
  { key: "fav", labelKey: "nav.favourites", Icon: FavouritesTabIcon },
  { key: "profile", labelKey: "nav.profile", Icon: ProfileTabIcon },
];

function BottomNav({ active, setActive }) {
  const { t } = useLanguage();
  return (
    <div
      style={{
        display: "flex",
        borderTop: `0.5px solid ${COLOR.line}`,
        background: COLOR.card,
        padding: "9px 6px 12px",
      }}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              cursor: "pointer",
              padding: "4px 0",
            }}
          >
            <tab.Icon active={isActive} size={tab.key === "list" ? 20 : 18} />
            <span style={{ fontFamily: SANS, fontSize: 9.5, color: isActive ? COLOR.ink : COLOR.inkSoft, fontWeight: isActive ? 600 : 400 }}>
              {t(tab.labelKey)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 520 : false
  );
  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 520);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isMobile;
}

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { listings, loading: listingsLoading } = useListings();
  const [active, setActive] = useState("home");
  const [favourites, setFavourites] = useState(new Set());
  const [selectedId, setSelectedId] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [stripeReturn, setStripeReturn] = useState(false);
  const isMobile = useIsMobile();

  // Stripe Connect onboarding redirects back here with ?stripe_return=1 (finished,
  // or at least exited the flow) or ?stripe_refresh=1 (the link expired mid-flow).
  // Either way: land on Profile, force a fresh status pull, and clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("stripe_return") || params.has("stripe_refresh")) {
      setActive("profile");
      setStripeReturn(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // A shared product link (?item=<id>) opens straight into that product once
  // listings have loaded — needs to wait, since selectedProduct is looked up
  // from the live listings array.
  const sharedItemHandled = React.useRef(false);
  useEffect(() => {
    if (sharedItemHandled.current || listingsLoading) return;
    const params = new URLSearchParams(window.location.search);
    const itemId = params.get("item");
    if (itemId) {
      if (listings.some((l) => l.id === itemId)) setSelectedId(itemId);
      sharedItemHandled.current = true;
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [listings, listingsLoading]);

  const toggleFav = (id) => {
    setFavourites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSeed = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      await seedListingsIfEmpty(user.uid, user.displayName || user.email || "You");
    } finally {
      setSeeding(false);
    }
  };

  // Opening a product logs it to the local (IndexedDB) recently-viewed list —
  // that's browsing activity nobody else needs to see, so it never touches Firestore.
  const openProduct = (id) => {
    setSelectedId(id);
    const p = listings.find((l) => l.id === id);
    if (p) {
      logRecentlyViewed({ id: p.id, brand: p.brand, title: p.title, image: p.images[0], price: p.price });
    }
  };

  const goShop = (category) => {
    setCategoryFilter(category || null);
    setActive("shop");
  };

  const goSearch = (keyword) => {
    setSearchKeyword(keyword || "");
    setCategoryFilter(null);
    setActive("shop");
  };

  const goList = () => setActive("list");

  const selectedProduct = selectedId != null ? listings.find((l) => l.id === selectedId) : null;

  const screen = selectedProduct ? (
    <ProductView
      product={selectedProduct}
      isSaved={favourites.has(selectedProduct.id)}
      onToggleSave={() => toggleFav(selectedProduct.id)}
      onBack={() => setSelectedId(null)}
      buyer={user ? { uid: user.uid, name: user.displayName || user.email?.split("@")[0] || "You" } : null}
    />
  ) : (
    {
      home: (
        <HomeScreen
          listings={listings}
          listingsLoading={listingsLoading}
          favourites={favourites}
          toggleFav={toggleFav}
          goShop={goShop}
          onSelectProduct={openProduct}
          onSearch={goSearch}
        />
      ),
      shop: (
        <DiscoverScreen
          listings={listings}
          onSelectProduct={openProduct}
          onSeed={handleSeed}
          seeding={seeding}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          searchKeyword={searchKeyword}
          setSearchKeyword={setSearchKeyword}
          goList={goList}
        />
      ),
      list: <ListScreen user={user} listings={listings} />,
      fav: (
        <FavouritesScreen
          listings={listings}
          favourites={favourites}
          toggleFav={toggleFav}
          onSelectProduct={openProduct}
        />
      ),
      profile: <ProfileScreen user={user} listings={listings} stripeReturn={stripeReturn} />,
    }[active]
  );

  const changeTab = (key) => {
    setSelectedId(null);
    setActive(key);
  };

  const { address, loading: addressLoading } = useUserAddress(user?.uid);

  const body = authLoading || (user && addressLoading) ? (
    <>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <HomeSkeleton />
      </div>
      <BottomNav active="home" setActive={() => {}} />
    </>
  ) : !user ? (
    <LoginScreen />
  ) : !address?.verified ? (
    <AddressSetup onSaved={() => {}} />
  ) : (
    <>
      <div style={{ flex: 1, overflowY: "auto" }}>{screen}</div>
      {!selectedProduct && <BottomNav active={active} setActive={changeTab} />}
    </>
  );

  if (isMobile) {
    return (
      <div
        style={{
          height: "100dvh",
          width: "100vw",
          background: COLOR.bg,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {FONT_LINK}
        {body}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#EDEAE2", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 12px" }}>
      {FONT_LINK}
      <div
        style={{
          width: 375,
          height: 780,
          background: COLOR.bg,
          borderRadius: 44,
          border: "10px solid #171614",
          boxShadow: "0 30px 60px rgba(0,0,0,0.25)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            width: 120,
            height: 22,
            background: "#171614",
            borderRadius: 12,
            zIndex: 10,
          }}
        />
        <div style={{ height: 40, flexShrink: 0 }} />
        {body}
      </div>
    </div>
  );
}
