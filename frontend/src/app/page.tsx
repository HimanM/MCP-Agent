"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import {
  AudioLines,
  ChevronLeft,
  ChevronRight,
  Gift,
  Grid2x2,
  Home,
  Menu,
  Mic,
  MoonStar,
  Package,
  Search,
  SendHorizontal,
  ShoppingBag,
  SunMedium,
  Tag,
  Truck,
  X,
} from "lucide-react";
import Cart from "@/components/Cart";
import ChatMessage from "@/components/ChatMessage";
import CheckoutDrawer from "@/components/CheckoutDrawer";
import GiftAdvisor from "@/components/GiftAdvisor";
import PayLinkCard from "@/components/PayLinkCard";
import ProductCard from "@/components/ProductCard";
import StatusModal from "@/components/StatusModal";
import TrackingCard from "@/components/TrackingCard";
import { useCart } from "@/hooks/useCart";
import { type Message, useChat } from "@/hooks/useChat";
import {
  addToCart,
  fetchTracking,
  getBackendMeta,
  type BackendMeta,
  placeOrder,
  streamChat,
  transcribeAudio,
  type CheckoutInfoPayload,
  type OrderSummary,
  type ProductSummary,
  type TrackingSummary,
  updateBudget,
  updateCheckoutInfo,
} from "@/lib/api";
import { parseChatCommand } from "@/lib/chat-command";
import {
  loadRecentCartSnapshots,
  type RecentCartSnapshot,
} from "@/lib/recent-carts";
import {
  isSpeechSynthesisSupported,
  playAssistantSpeech,
  subscribeSpeechState,
  stopSpeaking,
} from "@/lib/speech";
import { getUiCopy, type UiLanguage } from "@/lib/ui-copy";

type ActiveView = "home" | "chat" | "gift" | "track" | "categories" | "offers";
type RightPanel = "cart" | "checkout" | null;
type CategoryOption = { label: string; href?: string };
type PageCopy = {
  home: string;
  newChat: string;
  offers: string;
  categoriesTitle: string;
  categoriesDescription: string;
  categoryBrowser: string;
  categoriesHelper: string;
  loadCategories: string;
  noCategories: string;
  categoryFlow: string;
  askCategoryAi: string;
  categoryLoading: (category: string) => string;
  categoryPrompt: string;
  offersTitle: string;
  offersDescription: string;
  offersLoader: string;
  offersHelper: string;
  loadOffers: string;
  offersLoading: string;
  noOffers: string;
  trackTitle: string;
  trackDescription: string;
  orderPlaceholder: string;
  trackButton: string;
  noTracking: string;
  checkoutSavedTitle: string;
  checkoutSavedBody: string;
  cartSummary: (count: number) => string;
  reorderTitle: string;
  reorderDescription: string;
  reorderButton: string;
  reorderEmpty: string;
  reorderLastSaved: string;
};

function generateSessionId() {
  return `sess-${Math.random().toString(36).slice(2, 10)}`;
}

const SESSION_STORAGE_KEY = "kapruka.chat.session";
const SESSION_TTL_MS = 5 * 60 * 1000;
const MODEL_OVERRIDE_STORAGE_KEY = "kapruka.chat.modelOverride";
const THEME_STORAGE_KEY = "kapruka.theme";
const EMPTY_RECENT_CARTS: RecentCartSnapshot[] = [];
const NOOP_UNSUBSCRIBE = () => {};
const subscribeHydration = () => NOOP_UNSUBSCRIBE;

const PAGE_COPY: Record<UiLanguage, PageCopy> = {
  en: {
    home: "Home",
    newChat: "New chat",
    offers: "Deals & Offers",
    categoriesTitle: "Browse by category, then shop inside it.",
    categoriesDescription: "Pick a category first. Once selected, we load matching Kapruka products into this same view so browsing feels like a real shopping step instead of a chat detour.",
    categoryBrowser: "Category browser",
    categoriesHelper: "Categories are loaded from the live Kapruka category tool.",
    loadCategories: "Load categories",
    noCategories: "No category tiles yet. Load categories first.",
    categoryFlow: "Expected flow: choose category, review products, then add to cart or continue the chat from that category context.",
    askCategoryAi: "Ask AI in this category",
    categoryLoading: (category) => `Loading products for ${category}...`,
    categoryPrompt: "Choose a category to load products here.",
    offersTitle: "Current deals, shown as products first.",
    offersDescription: "This section now loads the live assistant-backed deal results and renders them directly as product cards. The next expected step is simple: scan the deals, open a product, or add it to cart.",
    offersLoader: "Offers loader",
    offersHelper: "Live results from the current assistant and Kapruka catalog tools.",
    loadOffers: "Load offers",
    offersLoading: "Loading current offers...",
    noOffers: "No offer products loaded yet.",
    trackTitle: "Check delivery status fast.",
    trackDescription: "Enter the Kapruka order number and get the latest tracking update without using the chat flow.",
    orderPlaceholder: "Enter order number",
    trackButton: "Track order",
    noTracking: "No tracking result yet. Enter an order number to load the latest update.",
    checkoutSavedTitle: "Checkout details saved",
    checkoutSavedBody: "Your cart is ready for order review and payment.",
    cartSummary: (count) => `${count} ${count === 1 ? "item" : "items"} in your cart`,
    reorderTitle: "Buy the same again",
    reorderDescription: "Recent cart picks are saved from your last shopping sessions so you can restock faster.",
    reorderButton: "Add all again",
    reorderEmpty: "Add a few items to cart once and your recent picks will show up here.",
    reorderLastSaved: "Last saved",
  },
  si: {
    home: "මුල් පිටුව",
    newChat: "නව චැට්",
    offers: "වට්ටම් සහ දීමනා",
    categoriesTitle: "කාණ්ඩයෙන් තෝරාගෙන එම ස්ථානයේම සාප්පු යන්න.",
    categoriesDescription: "පළමුව කාණ්ඩයක් තෝරන්න. ඉන්පසු ඒ කාණ්ඩයට අදාළ Kapruka නිෂ්පාදන මෙතැනම පෙන්වයි.",
    categoryBrowser: "කාණ්ඩ බ්‍රවුසරය",
    categoriesHelper: "කාණ්ඩ සජීවී Kapruka category tool එකෙන් ලබාගනී.",
    loadCategories: "කාණ්ඩ පූරණය කරන්න",
    noCategories: "තවම කාණ්ඩ නොමැත. පළමුව කාණ්ඩ පූරණය කරන්න.",
    categoryFlow: "ගමන්මග: කාණ්ඩය තෝරන්න, නිෂ්පාදන බලන්න, cart එකට එක් කරන්න හෝ ඒ කාණ්ඩයට අදාලව AI සමඟ ඉදිරියට යන්න.",
    askCategoryAi: "මෙම කාණ්ඩයට AI අසන්න",
    categoryLoading: (category) => `${category} සඳහා නිෂ්පාදන පූරණය වෙමින්...`,
    categoryPrompt: "නිෂ්පාදන පෙන්වීමට කාණ්ඩයක් තෝරන්න.",
    offersTitle: "දැන් ඇති දීමනා, නිෂ්පාදන ලෙසම පෙන්වයි.",
    offersDescription: "මෙම කොටස live assistant-backed deals ප්‍රතිඵල සෘජුව product cards ලෙස පෙන්වයි.",
    offersLoader: "දීමනා පූරණය",
    offersHelper: "වර්තමාන assistant සහ Kapruka catalog tools වලින් සජීවී ප්‍රතිඵල.",
    loadOffers: "දීමනා පූරණය කරන්න",
    offersLoading: "වත්මන් දීමනා පූරණය වෙමින්...",
    noOffers: "තවම offer නිෂ්පාදන පූරණය වී නැත.",
    trackTitle: "බෙදාහැරීමේ තත්ත්වය ඉක්මනින් බලන්න.",
    trackDescription: "Kapruka order number එක ඇතුළත් කර chat flow නොමැතිවම tracking update එක ලබාගන්න.",
    orderPlaceholder: "Order number එක ඇතුළත් කරන්න",
    trackButton: "Track කරන්න",
    noTracking: "තවම tracking ප්‍රතිඵලයක් නැත. Order number එකක් ඇතුළත් කරන්න.",
    checkoutSavedTitle: "Checkout විස්තර සුරකින ලදි",
    checkoutSavedBody: "ඔබගේ cart එක order review සහ payment සඳහා සූදානම්.",
    cartSummary: (count) => `cart එකේ ${count} ${count === 1 ? "item" : "items"}`,
    reorderTitle: "Buy the same again",
    reorderDescription: "Recent cart picks are saved from your last shopping sessions so you can restock faster.",
    reorderButton: "Add all again",
    reorderEmpty: "Add a few items to cart once and your recent picks will show up here.",
    reorderLastSaved: "Last saved",
  },
  ta: {
    home: "முகப்பு",
    newChat: "புதிய அரட்டை",
    offers: "சலுகைகள்",
    categoriesTitle: "பிரிவைத் தேர்ந்து அதிலேயே வாங்குங்கள்.",
    categoriesDescription: "முதலில் ஒரு category-ஐ தேர்ந்தெடுக்கவும். பிறகு அதற்கான Kapruka products இதே view-ல் வரும்.",
    categoryBrowser: "பிரிவு உலாவி",
    categoriesHelper: "பிரிவுகள் live Kapruka category tool மூலம் ஏற்றப்படுகின்றன.",
    loadCategories: "பிரிவுகளை ஏற்று",
    noCategories: "இன்னும் பிரிவுகள் இல்லை. முதலில் பிரிவுகளை ஏற்றவும்.",
    categoryFlow: "Flow: பிரிவைத் தேர்வுசெய், products பார், cart-க்கு சேர் அல்லது அந்தப் பிரிவில் AI உதவியை கேள்.",
    askCategoryAi: "இந்த பிரிவில் AI-யை கேள்",
    categoryLoading: (category) => `${category} products ஏற்றப்படுகிறது...`,
    categoryPrompt: "இங்கே products பார்க்க ஒரு category-ஐ தேர்ந்தெடுக்கவும்.",
    offersTitle: "தற்போதைய சலுகைகள், நேராக products ஆக.",
    offersDescription: "இந்த பகுதி live deals முடிவுகளை நேராக product cards ஆக காட்டும்.",
    offersLoader: "சலுகை ஏற்றி",
    offersHelper: "நடப்பு assistant மற்றும் Kapruka catalog tools இலிருந்து live results.",
    loadOffers: "சலுகைகளை ஏற்று",
    offersLoading: "தற்போதைய சலுகைகள் ஏற்றப்படுகிறது...",
    noOffers: "இன்னும் offer products ஏற்றப்படவில்லை.",
    trackTitle: "டெலிவரி நிலையை விரைவாக பார்க்கவும்.",
    trackDescription: "Kapruka order number-ஐ உள்ளிட்டு chat இல்லாமல் latest tracking update பெறுங்கள்.",
    orderPlaceholder: "Order number-ஐ உள்ளிடவும்",
    trackButton: "Track செய்",
    noTracking: "இன்னும் tracking result இல்லை. Order number-ஐ உள்ளிடவும்.",
    checkoutSavedTitle: "Checkout விவரங்கள் சேமிக்கப்பட்டது",
    checkoutSavedBody: "உங்கள் cart order review மற்றும் payment க்குத் தயாராக உள்ளது.",
    cartSummary: (count) => `உங்கள் cart-ல் ${count} ${count === 1 ? "item" : "items"}`,
    reorderTitle: "Buy the same again",
    reorderDescription: "Recent cart picks are saved from your last shopping sessions so you can restock faster.",
    reorderButton: "Add all again",
    reorderEmpty: "Add a few items to cart once and your recent picks will show up here.",
    reorderLastSaved: "Last saved",
  },
};

const GITHUB_URL = "https://github.com/HimanM";
const LINKEDIN_URL = "https://www.linkedin.com/in/HimanM";

const CATEGORY_PROMPT: Record<UiLanguage, string> = {
  en: "Show me Kapruka product categories",
  si: "Kapruka à¶±à·’à·‚à·Šà¶´à·à¶¯à¶± à¶šà·à¶«à·Šà¶© à¶´à·™à¶±à·Šà¶±à¶±à·Šà¶±",
  ta: "Kapruka product categories à®•à®¾à®Ÿà¯à®Ÿà¯",
};

function loadSessionId() {
  if (typeof window === "undefined") return generateSessionId();
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as { id?: string; expiresAt?: number };
      if (stored.id && stored.expiresAt && stored.expiresAt > Date.now()) return stored.id;
    }
  } catch {
    // ignore
  }
  return generateSessionId();
}

function hasStoredSession() {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return false;
    const stored = JSON.parse(raw) as { id?: string; expiresAt?: number };
    return Boolean(stored.id && stored.expiresAt && stored.expiresAt > Date.now());
  } catch {
    return false;
  }
}

function saveSessionId(sessionId: string) {
  try {
    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ id: sessionId, expiresAt: Date.now() + SESSION_TTL_MS })
    );
  } catch {
    // ignore
  }
}

function loadModelOverride() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(MODEL_OVERRIDE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`grid place-items-center overflow-hidden border border-border bg-[linear-gradient(180deg,#fffaf5,#f6e7d8)] shadow-[0_12px_30px_rgba(200,105,58,0.12)] ${
        compact ? "h-9 w-9 rounded-[1rem]" : "h-11 w-11 rounded-[1.15rem]"
      }`}
    >
      <Image
        src="/kapruka-mark.png"
        alt="Kapruka AI logo"
        width={compact ? 22 : 26}
        height={compact ? 22 : 26}
        priority
      />
    </div>
  );
}

function SidebarLink({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="app-sidebar-link min-h-[2.75rem] text-[13px] font-medium"
      data-active={active}
      onClick={onClick}
    >
      <span className="text-accent">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function ActionChip({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-9 w-full items-center justify-start gap-2 rounded-full border border-border bg-surface px-3 py-2 text-[12px] font-medium text-ink transition hover:border-border-hover hover:bg-surface-2 md:min-h-8 md:w-auto md:px-3.5"
    >
      <span className="text-accent">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function LanguageSwitch({
  value,
  onChange,
}: {
  value: UiLanguage;
  onChange: (language: UiLanguage) => void;
}) {
  const labels: Record<UiLanguage, string> = {
    en: "ENG",
    si: "සිංහල",
    ta: "தமிழ்",
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-white p-1">
      {(["en", "si", "ta"] as UiLanguage[]).map((language) => (
        <button
          key={language}
          type="button"
          onClick={() => onChange(language)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${value === language ? "bg-accent text-white" : "text-ink-soft"}`}
        >
          {labels[language]}
        </button>
      ))}
    </div>
  );
}

void LanguageSwitch;

function UtilityIconButton({
  icon,
  label,
  active = false,
  disabled = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid h-10 w-10 place-items-center rounded-full border ${
        active ? "border-accent bg-accent text-white" : "border-border bg-surface text-ink-soft hover:border-border-hover hover:text-ink"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {icon}
    </button>
  );
}

function CheckoutSummaryCard({
  recipientName,
  deliveryCity,
  senderName,
  total,
  itemCount,
  onEdit,
}: {
  recipientName?: string;
  deliveryCity?: string;
  senderName?: string;
  total: number;
  itemCount: number;
  onEdit: () => void;
}) {
  return (
    <section className="surface-panel rounded-[1.35rem] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-ink">Checkout Details</h3>
          <p className="mt-1 text-sm text-ink-soft">Saved delivery details for this cart session.</p>
        </div>
        <button type="button" onClick={onEdit} className="text-sm font-medium text-accent hover:text-accent-hover">
          Edit
        </button>
      </div>

      <div className="space-y-4 text-sm">
        <div className="rounded-[1rem] border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Deliver to</p>
          <p className="mt-2 font-medium text-ink">{recipientName || "Not saved yet"}</p>
          <p className="mt-1 text-ink-soft">{deliveryCity || "Add recipient and city"}</p>
        </div>
        <div className="rounded-[1rem] border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Sender</p>
          <p className="mt-2 font-medium text-ink">{senderName || "Not saved yet"}</p>
        </div>
        <div className="flex items-center justify-between rounded-[1rem] border border-border bg-surface-2 p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Total</p>
            <p className="mt-1 text-lg font-semibold text-ink">LKR {total.toLocaleString()}</p>
          </div>
          <div className="text-right text-sm text-ink-soft">
            <p>{itemCount} {itemCount === 1 ? "item" : "items"}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function MobileDrawer({
  activeView,
  onChange,
  onClose,
  voiceInputSupported,
  voiceRepliesSupported,
  voiceRepliesEnabled,
  isListening,
  isStreaming,
  onToggleListening,
  onToggleVoiceReplies,
  onNewChat,
  copy,
  giftAdvisorLabel,
  trackOrderLabel,
  browseCategoriesLabel,
}: {
  activeView: ActiveView;
  onChange: (view: ActiveView) => void;
  onClose: () => void;
  voiceInputSupported: boolean;
  voiceRepliesSupported: boolean;
  voiceRepliesEnabled: boolean;
  isListening: boolean;
  isStreaming: boolean;
  onToggleListening: () => void;
  onToggleVoiceReplies: () => void;
  onNewChat: () => void;
  copy: PageCopy;
  giftAdvisorLabel: string;
  trackOrderLabel: string;
  browseCategoriesLabel: string;
}) {
  const items: { icon: React.ReactNode; label: string; view: ActiveView }[] = [
    { icon: <Home size={18} />, label: copy.home, view: "home" },
    { icon: <Gift size={18} />, label: giftAdvisorLabel, view: "gift" },
    { icon: <Truck size={18} />, label: trackOrderLabel, view: "track" },
    { icon: <Grid2x2 size={18} />, label: browseCategoriesLabel, view: "categories" },
    { icon: <Tag size={18} />, label: copy.offers, view: "offers" },
  ];

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
        aria-label="Close navigation drawer"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex flex-col bg-[color:var(--color-bg)] px-5 py-5 backdrop-blur-xl lg:hidden">
        <div className="drawer-item drawer-delay-1 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandMark compact />
            <div>
              <p className="mimo-serif text-[1.35rem] leading-none text-ink">Kapruka <span className="text-accent">AI</span></p>
              <p className="mt-1 text-[11px] text-ink-soft">{copy.home}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-button-compact text-ink-soft"
          >
            <X size={18} />
          </button>
        </div>

        <div className="drawer-item drawer-delay-2 mt-6 space-y-2">
          {items.map((item) => (
            <SidebarLink
              key={item.label}
              icon={item.icon}
              label={item.label}
              active={activeView === item.view}
              onClick={() => {
                onChange(item.view);
                onClose();
              }}
            />
          ))}
          <SidebarLink
            icon={<Search size={18} />}
            label={copy.newChat}
            onClick={() => {
              onNewChat();
              onClose();
            }}
          />
        </div>

        <div className="drawer-item drawer-delay-3 mt-auto space-y-4">
          <div className="flex items-center gap-2">
            <UtilityIconButton
              icon={voiceInputSupported ? <Mic size={16} /> : <Mic size={16} />}
              label={isListening ? "Stop voice input" : "Start voice input"}
              active={isListening}
              disabled={isStreaming || !voiceInputSupported}
              onClick={onToggleListening}
            />
            {voiceRepliesSupported ? (
              <UtilityIconButton
                icon={<AudioLines size={16} />}
                label={voiceRepliesEnabled ? "Stop assistant voice" : "Play latest assistant voice"}
                active={voiceRepliesEnabled}
                onClick={onToggleVoiceReplies}
              />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

function findLatestTracking(messages: Message[]) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const result = messages[i].toolResults?.map((entry) => entry.tracking).find(Boolean);
    if (result) return result as TrackingSummary;
  }
  return null;
}

function formatRecentSavedAt(savedAt: number) {
  const diffMinutes = Math.max(1, Math.round((Date.now() - savedAt) / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.round(diffHours / 24)}d ago`;
}

function extractCategoriesFromText(raw: string): CategoryOption[] {
  const markdownLinks = [...raw.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)]
    .map((match) => ({ label: match[1].trim(), href: match[2] }))
    .filter((item) => item.label);

  if (!markdownLinks.length) return [];

  const seen = new Set<string>();
  return markdownLinks.filter((item) => {
    const key = item.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 24);
}

function parseCategoriesFromMessages(messages: Message[]): CategoryOption[] {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    const usedCategoryTool = message.toolCalls?.some((tool) => tool.tool === "list_categories");
    if (!usedCategoryTool) continue;

    const raw =
      message.toolResults?.find((entry) => entry.tool === "list_categories")?.result ||
      message.content ||
      "";
    if (!raw) continue;

    const categories = extractCategoriesFromText(raw);
    if (categories.length) return categories;
  }
  return [];
}

function TrackOrderPanel({
  tracking,
  isLoading,
  onSubmit,
  copy,
}: {
  tracking: TrackingSummary | null;
  isLoading: boolean;
  onSubmit: (orderNumber: string) => void;
  copy: PageCopy;
}) {
  const [orderNumber, setOrderNumber] = useState("");

  return (
    <section className="flex w-full flex-col gap-6">
      <div className="rounded-[1.2rem] border border-border bg-surface px-4 py-4 shadow-[0_14px_34px_rgba(15,15,15,0.03)] md:rounded-[1.4rem] md:p-6">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Track order</p>
        <h1 className="mimo-serif mt-2 text-[1.8rem] leading-[1.02] text-ink md:text-[3.2rem]">{copy.trackTitle}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft md:text-[15px] md:leading-7">{copy.trackDescription}</p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!orderNumber.trim()) return;
            onSubmit(orderNumber.trim());
          }}
          className="mt-6 flex flex-col gap-3 sm:flex-row"
        >
          <input
            value={orderNumber}
            onChange={(event) => setOrderNumber(event.target.value)}
            placeholder={copy.orderPlaceholder}
            className="min-h-[3.5rem] w-full appearance-none rounded-[1rem] border border-border bg-surface-2 px-5 py-4 text-base leading-none text-ink outline-none shadow-[0_8px_24px_rgba(15,15,15,0.03)] focus:border-accent md:h-11 md:min-h-0 md:px-4 md:py-0 md:text-sm md:shadow-none"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="h-12 rounded-full bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 md:h-11"
          >
            {isLoading ? "Checking..." : copy.trackButton}
          </button>
        </form>
      </div>

      {tracking ? (
        <TrackingCard tracking={tracking} />
      ) : (
        <div className="rounded-[1.1rem] border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-ink-soft md:rounded-[1.2rem] md:px-6 md:py-10">
          {copy.noTracking}
        </div>
      )}
    </section>
  );
}

function WorkflowPanel({
  title,
  description,
  eyebrow,
  children,
}: {
  title: string;
  description: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex w-full flex-col gap-6">
      <div className="px-1 py-1 md:px-2">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{eyebrow}</p>
        <h1 className="mimo-serif mt-2 text-[1.8rem] leading-[1.02] text-ink md:text-[3rem]">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-soft md:text-[15px] md:leading-7">{description}</p>
      </div>
      {children}
    </section>
  );
}

function CheckoutPanelFooter({
  error,
  actionLabel,
  onAction,
  actionHref,
  actionDisabled = false,
  panelTone = "transparent",
  compactTopSpacing = false,
}: {
  error?: string | null;
  actionLabel: string;
  onAction?: () => void;
  actionHref?: string;
  actionDisabled?: boolean;
  panelTone?: "transparent" | "surface";
  compactTopSpacing?: boolean;
}) {
  return (
    <div className={`border-t border-border px-4 py-4 ${panelTone === "surface" ? "bg-surface" : ""}`}>
      {error ? (
        <div className="mb-3 rounded-[1rem] border border-red-500/30 bg-red-500/8 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {actionHref ? (
        <a
          href={actionHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`${compactTopSpacing ? "" : "mt-3 "}flex h-11 w-full items-center justify-center rounded-full bg-accent text-sm font-medium text-white hover:bg-accent-hover`}
        >
          {actionLabel}
        </a>
      ) : (
        <button
          type="button"
          onClick={onAction}
          disabled={actionDisabled}
          className={`${compactTopSpacing ? "" : "mt-3 "}h-11 w-full rounded-full bg-accent text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

const CHECKOUT_PANEL_SUBTITLE = "Review delivery and payment";

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-1.98c-3.2.69-3.88-1.36-3.88-1.36-.52-1.31-1.27-1.66-1.27-1.66-1.04-.71.08-.69.08-.69 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.24 3.33.95.1-.74.4-1.24.72-1.52-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.47.11-3.06 0 0 .97-.31 3.17 1.18a10.9 10.9 0 0 1 5.77 0c2.19-1.49 3.16-1.18 3.16-1.18.63 1.59.24 2.77.12 3.06.74.81 1.18 1.84 1.18 3.1 0 4.42-2.68 5.39-5.24 5.68.41.35.77 1.03.77 2.07v3.07c0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12c0-6.35-5.15-11.5-11.5-11.5Z" />
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M4.98 3.5A2.49 2.49 0 1 0 5 8.48 2.49 2.49 0 0 0 4.98 3.5ZM3 9h4v12H3V9Zm6.5 0h3.83v1.64h.05c.53-1 1.84-2.05 3.79-2.05 4.05 0 4.8 2.66 4.8 6.12V21h-4v-5.47c0-1.3-.03-2.98-1.81-2.98-1.82 0-2.1 1.42-2.1 2.88V21h-4V9Z" />
    </svg>
  );
}

function CatalogRail({
  products,
  sessionId,
  onAdded,
}: {
  products: ProductSummary[];
  sessionId: string;
  onAdded: () => void | Promise<void>;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  if (!products.length) return null;

  const scrollRail = (direction: "left" | "right") => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction === "right" ? rail.clientWidth * 0.92 : -rail.clientWidth * 0.92, behavior: "smooth" });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-ink-soft md:text-sm">Swipe or use arrows</p>
        {products.length > 4 ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollRail("left")}
              className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-ink-soft hover:text-ink"
              aria-label="Scroll products left"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => scrollRail("right")}
              className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-ink-soft hover:text-ink"
              aria-label="Scroll products right"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        ) : null}
      </div>

      <div
        ref={railRef}
        className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <div
            key={product.product_id || product.product_url || product.name}
            className="w-[10.5rem] shrink-0 sm:w-[10rem] md:w-[11.5rem] xl:w-auto xl:basis-[calc((100%-2.25rem)/4)]"
          >
            <ProductCard product={product} sessionId={sessionId} onAdded={onAdded} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const [sessionId] = useState(loadSessionId);
  const [modelOverride, setModelOverride] = useState<string | null>(() => loadModelOverride());
  const { messages, isStreaming, error, sendMessage, clearMessages } = useChat(sessionId, modelOverride);
  const { cart, total, updateQuantity, removeItem, refresh } = useCart(sessionId);
  const [backendMeta, setBackendMeta] = useState<BackendMeta | null>(null);
  const [input, setInput] = useState("");
  const [showNav, setShowNav] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanel>(null);
  const [desktopPanel, setDesktopPanel] = useState<Exclude<RightPanel, null>>("cart");
  const [showCheckout, setShowCheckout] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [checkoutSaving, setCheckoutSaving] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSaved, setCheckoutSaved] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [latestPlacedOrder, setLatestPlacedOrder] = useState<OrderSummary | null>(null);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>(() => (hasStoredSession() ? "chat" : "home"));
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [categoryProducts, setCategoryProducts] = useState<ProductSummary[]>([]);
  const [offerProducts, setOfferProducts] = useState<ProductSummary[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryProductsLoading, setCategoryProductsLoading] = useState(false);
  const [offersLoading, setOffersLoading] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [trackingLookup, setTrackingLookup] = useState<TrackingSummary | null>(null);
  const [trackingLookupBusy, setTrackingLookupBusy] = useState(false);
  const [trackingLookupError, setTrackingLookupError] = useState<string | null>(null);
  const [restoringRecentId, setRestoringRecentId] = useState<string | null>(null);
  const [uiLanguage] = useState<UiLanguage>("en");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "light" ? "light" : "dark";
  });
  const [isListening, setIsListening] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [activeSpeechKey, setActiveSpeechKey] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const inputBeforeRecordingRef = useRef("");
  const mimeTypeRef = useRef("webm");

  const uiCopy = getUiCopy(uiLanguage);
  const pageCopy = PAGE_COPY[uiLanguage];
  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const categoryPrompt = CATEGORY_PROMPT[uiLanguage];
  const budgetValue = budgetDraft || (cart.budget_max != null ? String(cart.budget_max) : "");
  const latestTracking = useMemo(() => findLatestTracking(messages), [messages]);
  const latestOrderFromMessages = useMemo(
    () =>
      [...messages]
        .reverse()
        .flatMap((message) => message.toolResults || [])
        .map((entry) => entry.order)
        .find((entry): entry is OrderSummary => Boolean(entry)) || null,
    [messages]
  );
  const latestAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant" && message.content.trim()) || null,
    [messages]
  );
  const latestAssistantSpeechKey = latestAssistantMessage ? `${latestAssistantMessage.id}:${latestAssistantMessage.content}` : null;
  const isAssistantSpeaking = Boolean(latestAssistantSpeechKey && activeSpeechKey === latestAssistantSpeechKey);
  const fallbackCategoryList = useMemo(() => parseCategoriesFromMessages(messages), [messages]);
  const categoryList = categoryOptions.length ? categoryOptions : fallbackCategoryList;
  const voiceInputSupported = useMemo(
    () =>
      typeof window !== "undefined" &&
      "MediaRecorder" in window &&
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia),
    []
  );
  const voiceRepliesSupported = useMemo(() => isSpeechSynthesisSupported(), []);
  const recentCarts = hydrated ? loadRecentCartSnapshots() : EMPTY_RECENT_CARTS;
  const hasCheckoutDetails = Boolean(
    cart.recipient?.name &&
    cart.recipient?.phone &&
    cart.delivery?.address &&
    cart.delivery?.city &&
    cart.delivery?.date &&
    cart.sender?.name
  );
  const canCheckoutNow = cartCount > 0 && hasCheckoutDetails;
  const panelOrder = latestPlacedOrder || latestOrderFromMessages;
  const checkoutActionLabel = panelOrder?.payment_url
    ? "Complete payment"
    : canCheckoutNow
      ? placingOrder
        ? "Preparing payment..."
        : "Checkout now"
      : "Edit delivery details";

  const dispatchPrompt = useCallback(
    (prompt: string, nextView: ActiveView = "chat") => {
      shouldAutoScrollRef.current = true;
      saveSessionId(sessionId);
      setActiveView(nextView);
      sendMessage(prompt);
      requestAnimationFrame(() => {
        const node = mainScrollRef.current;
        if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
      });
    },
    [sendMessage, sessionId]
  );

  const submitCurrentMessage = useCallback(() => {
    const nextMessage = input.trim();
    if (!nextMessage || isStreaming) return;

    const command = parseChatCommand(nextMessage);
    if (command?.type === "status") {
      setShowStatus(true);
      setInput("");
      return;
    }

    shouldAutoScrollRef.current = true;
    saveSessionId(sessionId);
    setActiveView("chat");
    sendMessage(nextMessage);
    setInput("");
    requestAnimationFrame(() => {
      const node = mainScrollRef.current;
      if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    });
  }, [input, isStreaming, sendMessage, sessionId]);

  useEffect(() => {
    saveSessionId(sessionId);
  }, [sessionId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    return () => {
      setMicActive(false);
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    try {
      if (modelOverride) {
        window.localStorage.setItem(MODEL_OVERRIDE_STORAGE_KEY, modelOverride);
      } else {
        window.localStorage.removeItem(MODEL_OVERRIDE_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [modelOverride]);

  useEffect(() => {
    if (!messages.length) return;
    if (!shouldAutoScrollRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return subscribeSpeechState(setActiveSpeechKey);
  }, []);

  useEffect(() => {
    let active = true;
    getBackendMeta(sessionId)
      .then((meta) => {
        if (active) setBackendMeta(meta);
      })
      .catch(() => {
        if (active) setBackendMeta(null);
      });
    return () => {
      active = false;
    };
  }, [sessionId, showStatus, messages.length, modelOverride]);

  const openCheckout = useCallback(() => {
    setCheckoutSaved(false);
    setCheckoutError(null);
    setDesktopPanel("checkout");
    setShowCheckout(true);
  }, []);

  const handleCheckoutSubmit = async (payload: CheckoutInfoPayload) => {
    setCheckoutSaving(true);
    setCheckoutError(null);
    try {
      await updateCheckoutInfo(sessionId, payload);
      await refresh();
      setCheckoutSaved(true);
      setShowCheckout(false);
      window.setTimeout(() => setCheckoutSaved(false), 2800);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Failed to save checkout details");
    } finally {
      setCheckoutSaving(false);
    }
  };

  const handlePanelCheckout = useCallback(async () => {
    if (!cartCount) return;
    if (!hasCheckoutDetails) {
      openCheckout();
      return;
    }

    setCheckoutError(null);
    setPlacingOrder(true);
    try {
      const response = await placeOrder(sessionId);
      setLatestPlacedOrder(response.order);
      await refresh();
      setDesktopPanel("checkout");
      setRightPanel("checkout");
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Failed to prepare payment link");
    } finally {
      setPlacingOrder(false);
    }
  }, [cartCount, hasCheckoutDetails, openCheckout, refresh, sessionId]);

  const handleBudgetSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBudgetSaving(true);
    try {
      const parsed = budgetValue.trim() ? Number(budgetValue.replace(/,/g, "")) : null;
      await updateBudget(sessionId, Number.isFinite(parsed as number) ? (parsed as number) : null);
      await refresh();
    } finally {
      setBudgetSaving(false);
    }
  };

  const handleBudgetClear = async () => {
    setBudgetSaving(true);
    try {
      setBudgetDraft("");
      await updateBudget(sessionId, null);
      await refresh();
    } finally {
      setBudgetSaving(false);
    }
  };

  const handleGiftAdvisorSubmit = (prompt: string) => {
    dispatchPrompt(prompt, "chat");
  };

  const handleRecentCartRestore = useCallback(
    async (recent: RecentCartSnapshot) => {
      if (restoringRecentId || !recent.items.length) return;

      setRestoringRecentId(recent.sessionId);
      stopSpeaking();
      try {
        for (const item of recent.items) {
          await addToCart(sessionId, item.product_id, item.quantity ?? 1);
        }
        await refresh();
        setDesktopPanel("cart");
        setRightPanel("cart");
        setShowNav(false);
      } finally {
        setRestoringRecentId(null);
      }
    },
    [refresh, restoringRecentId, sessionId]
  );

  const openRightPanel = (panel: Exclude<RightPanel, null>) => {
    setDesktopPanel(panel);
    setRightPanel(panel);
  };

  const toggleLatestAssistantSpeech = useCallback(() => {
    if (!latestAssistantMessage) return;
    if (isAssistantSpeaking) {
      stopSpeaking();
      return;
    }
    void playAssistantSpeech(
      latestAssistantMessage.content,
      uiLanguage,
      Boolean(backendMeta?.tts.configured),
      latestAssistantSpeechKey || undefined
    );
  }, [backendMeta, isAssistantSpeaking, latestAssistantMessage, latestAssistantSpeechKey, uiLanguage]);

  const toggleBackupModel = useCallback(() => {
    const backupModel = backendMeta?.openrouter.backup_model;
    if (!backupModel) return;
    setModelOverride((current) => (current ? null : backupModel));
  }, [backendMeta]);

  const loadCategories = useCallback(async () => {
    setCategoryLoading(true);
    setCategoryError(null);
    try {
      let nextCategories: CategoryOption[] = [];
      for await (const event of streamChat(categoryPrompt, sessionId, undefined, undefined, modelOverride)) {
        if (event.type === "tool_result" && event.tool === "list_categories" && event.result) {
          nextCategories = extractCategoriesFromText(event.result);
        }
        if (event.type === "text" && !nextCategories.length && event.text) {
          nextCategories = extractCategoriesFromText(event.text);
        }
      }
      setCategoryOptions(nextCategories);
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : "Failed to load categories");
    } finally {
      setCategoryLoading(false);
    }
  }, [categoryPrompt, modelOverride, sessionId]);

  const loadCategoryProducts = useCallback(async (category: string) => {
    setSelectedCategory(category);
    setCategoryProductsLoading(true);
    setCategoryError(null);
    setCategoryProducts([]);
    try {
      for await (const event of streamChat(`Show popular ${category} products on Kapruka with prices`, sessionId, undefined, undefined, modelOverride)) {
        if (event.type === "tool_result" && event.products?.length) {
          setCategoryProducts(event.products);
        }
      }
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : "Failed to load products");
    } finally {
      setCategoryProductsLoading(false);
    }
  }, [modelOverride, sessionId]);

  const loadOffers = useCallback(async () => {
    setOffersLoading(true);
    setOffersError(null);
    try {
      let products: ProductSummary[] = [];
      for await (const event of streamChat("Show current Kapruka deals and offers with products and prices", sessionId, undefined, undefined, modelOverride)) {
        if (event.type === "tool_result" && event.products?.length) {
          products = event.products;
        }
      }
      setOfferProducts(products);
    } catch (error) {
      setOffersError(error instanceof Error ? error.message : "Failed to load offers");
    } finally {
      setOffersLoading(false);
    }
  }, [modelOverride, sessionId]);

  const activateView = useCallback(
    (nextView: ActiveView) => {
      setActiveView(nextView);
      if (nextView === "categories" && !categoryOptions.length && !categoryLoading) {
        void loadCategories();
      }
      if (nextView === "offers" && !offerProducts.length && !offersLoading) {
        void loadOffers();
      }
    },
    [categoryLoading, categoryOptions.length, loadCategories, loadOffers, offerProducts.length, offersLoading]
  );

  const handleNewChat = () => {
    clearMessages();
    setInput("");
    stopSpeaking();
    setSelectedCategory(null);
    setCategoryProducts([]);
    setTrackingLookup(null);
    setTrackingLookupError(null);
    setShowNav(false);
    setActiveView("home");
  };

  const handleTrackSubmit = async (orderNumber: string) => {
    setTrackingLookupBusy(true);
    setTrackingLookupError(null);
    setTrackingLookup(null);
    setActiveView("track");
    try {
      const next = await fetchTracking(orderNumber);
      setTrackingLookup(next);
    } catch {
      setTrackingLookupError("Unable to load tracking right now. Please recheck the order number and try again.");
    } finally {
      setTrackingLookupBusy(false);
    }
  };

  const toggleListening = async () => {
    if (micActive) {
      mediaRecorderRef.current?.stop();
      return;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      inputBeforeRecordingRef.current = input.trim();

      const preferredMimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = preferredMimeType ? new MediaRecorder(stream, { mimeType: preferredMimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      mimeTypeRef.current = recorder.mimeType.includes("mp4")
        ? "mp4"
        : recorder.mimeType.includes("ogg")
          ? "ogg"
          : recorder.mimeType.includes("mpeg")
            ? "mp3"
            : recorder.mimeType.includes("wav")
              ? "wav"
              : "webm";

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        setMicActive(false);
        setIsListening(false);
        mediaRecorderRef.current = null;
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;

        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        audioChunksRef.current = [];
        if (!audioBlob.size) return;

        try {
          const result = await transcribeAudio(audioBlob, mimeTypeRef.current);
          const transcript = result.text.trim();
          if (!transcript) return;
          setInput([inputBeforeRecordingRef.current, transcript].filter(Boolean).join(" ").trim());
        } catch (error) {
          console.warn("audio-transcription-error", error);
        }
      };

      recorder.onerror = () => {
        setMicActive(false);
        setIsListening(false);
        mediaRecorderRef.current = null;
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      };

      recorder.start();
      setMicActive(true);
      setIsListening(true);
    } catch {
      setMicActive(false);
      setIsListening(false);
    }
  };

  const quickActions = [
    { icon: <Gift size={18} />, label: uiCopy.openGiftAdvisor, action: () => activateView("gift") },
    { icon: <Truck size={18} />, label: uiCopy.trackMyOrder, action: () => activateView("track") },
    { icon: <Grid2x2 size={18} />, label: uiCopy.browseCategories, action: () => activateView("categories") },
    { icon: <Tag size={18} />, label: pageCopy.offers, action: () => activateView("offers") },
  ];

  const suggestionPresets: Record<UiLanguage, { label: string; prompt: string }[]> = {
    en: [
      { label: "Restock groceries", prompt: "Help me restock weekly groceries on Kapruka" },
      { label: "Phone charger", prompt: "Need a phone charger today, not too expensive" },
      { label: "Office wear", prompt: "I need something decent to wear for an office function" },
      { label: "Care flowers", prompt: "Send flowers to my aunt, she is not well" },
    ],
    si: [
      { label: "Groceries නැවත ගන්න", prompt: "Kapruka එකෙන් මගේ සතිපතා groceries නැවත ගන්න උදව් කරන්න" },
      { label: "Phone charger", prompt: "cheap phone charger ekak ada hoyanna" },
      { label: "Office wear", prompt: "office function ekakata andinna decent dewal hoyanna" },
      { label: "Care flowers", prompt: "mage nenda leda, eyata yawanṇa hariyana flowers hoyanna" },
    ],
    ta: [
      { label: "Groceries மீண்டும் வாங்க", prompt: "Kapruka-vil en vaarantha groceries meendum vaanga udhavi sei" },
      { label: "Phone charger", prompt: "cheap-a phone charger venum, innikku thevai" },
      { label: "Office wear", prompt: "office function-kku decent-a wear panna edhavadu kaatu" },
      { label: "Care flowers", prompt: "en aunt nalla illa, avangalukku anuppa suitable flowers kaatu" },
    ],
  };

  const suggestionActions = (suggestionPresets[uiLanguage] || uiCopy.suggestions).map((suggestion) => ({
    label: suggestion.label,
    action: () => dispatchPrompt(suggestion.prompt, "chat"),
  }));

  const showComposer = activeView === "home" || activeView === "chat";
  const showHero = messages.length === 0 && (activeView === "home" || activeView === "chat");

  const updateAutoScrollState = useCallback(() => {
    const node = mainScrollRef.current;
    if (!node) return;
    const remaining = node.scrollHeight - node.scrollTop - node.clientHeight;
    shouldAutoScrollRef.current = remaining < 80;
  }, []);

  const resizeComposer = useCallback(() => {
    const node = composerTextareaRef.current;
    if (!node) return;
    node.style.height = "0px";
    const nextHeight = Math.min(node.scrollHeight, 64);
    node.style.height = `${nextHeight}px`;
    node.style.overflowY = node.scrollHeight > 64 ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    resizeComposer();
  }, [input, resizeComposer]);

  if (!hydrated) {
    return <div className="app-shell h-screen overflow-hidden bg-canvas" />;
  }

  return (
    <div className="app-shell h-screen overflow-hidden text-ink">
      <StatusModal
        open={showStatus}
        onClose={() => setShowStatus(false)}
        backendMeta={backendMeta}
        sessionId={sessionId}
        uiLanguage={uiLanguage}
        cartCount={cartCount}
        voiceInputSupported={voiceInputSupported}
        voiceRepliesEnabled={isAssistantSpeaking}
        isListening={isListening}
        backupModelEnabled={Boolean(modelOverride)}
        onToggleBackupModel={toggleBackupModel}
      />

      {checkoutSaved ? (
        <div className="animate-pop-in fixed bottom-28 left-1/2 z-[85] w-[min(92vw,24rem)] -translate-x-1/2 rounded-[1.6rem] border border-[rgba(101,139,82,0.25)] bg-surface/95 p-4 shadow-[0_20px_54px_rgba(65,38,19,0.16)]">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-[rgba(101,139,82,0.14)] text-success">
              <Package size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{pageCopy.checkoutSavedTitle}</p>
              <p className="mt-1 text-sm text-ink-soft">{pageCopy.checkoutSavedBody}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex h-full w-full max-w-none flex-col overflow-hidden px-2 py-2 md:px-3 md:py-3 lg:px-2">
        <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[14rem_minmax(0,1fr)_20.5rem]">
        <aside className="glass-panel hidden min-h-0 rounded-[1.6rem] p-4 lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <div className="flex items-baseline gap-1 text-[1.85rem] leading-none">
                <span className="mimo-serif text-ink">Kapruka</span>
                <span className="mimo-serif text-accent">AI</span>
              </div>
              <p className="mt-1 text-xs text-ink-soft">{uiCopy.assistantLabel}</p>
            </div>
          </div>

          <div className="mt-6 space-y-1.5">
            <SidebarLink icon={<Home size={18} />} label={pageCopy.home} active={activeView === "home"} onClick={() => activateView("home")} />
            <SidebarLink icon={<Gift size={18} />} label="Gift Advisor" active={activeView === "gift"} onClick={() => activateView("gift")} />
            <SidebarLink icon={<Truck size={18} />} label="Track Order" active={activeView === "track"} onClick={() => activateView("track")} />
            <SidebarLink icon={<Grid2x2 size={18} />} label="Browse Categories" active={activeView === "categories"} onClick={() => activateView("categories")} />
            <SidebarLink icon={<Tag size={18} />} label={pageCopy.offers} active={activeView === "offers"} onClick={() => activateView("offers")} />
            <SidebarLink icon={<Search size={18} />} label={pageCopy.newChat} onClick={handleNewChat} />
          </div>

          <div className="mt-6 flex-1 overflow-y-auto">
            <div className="rounded-[1.2rem] border border-border bg-surface px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Recent carts</p>
                <span className="text-xs text-ink-soft">{recentCarts.length}</span>
              </div>
              <div className="mt-3 space-y-1.5">
                {recentCarts.slice(0, 4).map((recent) => (
                  <button
                    key={recent.sessionId}
                    type="button"
                    onClick={() => void handleRecentCartRestore(recent)}
                    disabled={restoringRecentId === recent.sessionId}
                    className="w-full rounded-[0.95rem] border border-transparent bg-surface-2 px-3 py-2.5 text-left hover:border-border disabled:cursor-wait disabled:opacity-70"
                  >
                    <p className="truncate text-[13px] font-medium text-ink">{recent.items[0]?.name || pageCopy.reorderTitle}</p>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-ink-soft">
                      <span>{restoringRecentId === recent.sessionId ? "Adding to cart..." : `${recent.itemCount} items`}</span>
                      <span>{formatRecentSavedAt(recent.savedAt)}</span>
                    </div>
                  </button>
                ))}
                {!recentCarts.length ? (
                  <div className="rounded-[0.95rem] bg-surface-2 px-3 py-3 text-xs leading-5 text-ink-soft">
                    {pageCopy.reorderEmpty}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="surface-panel rounded-[1.2rem] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">HimanM</p>
                  <p className="mt-1 text-xs text-ink-soft">Builder profile</p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-2 text-ink-soft transition hover:border-border-hover hover:text-ink"
                    aria-label="Open GitHub profile"
                  >
                    <GithubIcon />
                  </a>
                  <a
                    href={LINKEDIN_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-2 text-ink-soft transition hover:border-border-hover hover:text-ink"
                    aria-label="Open LinkedIn profile"
                  >
                    <LinkedinIcon />
                  </a>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <UtilityIconButton
                icon={theme === "dark" ? <SunMedium size={16} /> : <MoonStar size={16} />}
                label="Toggle theme"
                onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              />
              {voiceRepliesSupported ? (
                <UtilityIconButton
                  icon={<AudioLines size={16} />}
                  label={isAssistantSpeaking ? "Stop assistant voice" : "Play latest assistant voice"}
                  active={isAssistantSpeaking}
                  onClick={toggleLatestAssistantSpeech}
                />
              ) : null}
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden lg:col-start-2">
          <header className="flex items-center justify-between gap-3 lg:hidden">
            <div className="flex w-full items-center gap-2 lg:hidden">
              <button
                type="button"
                className="icon-button-compact text-ink"
                onClick={() => setShowNav(true)}
                aria-label="Open navigation drawer"
              >
                <Menu size={16} />
              </button>
              <div className="flex min-w-0 flex-1 items-center gap-2 pl-1">
                <BrandMark compact />
                <p className="truncate mimo-serif text-[1.05rem] leading-none text-ink sm:text-[1.1rem]">
                  Kapruka <span className="text-accent">AI</span>
                </p>
              </div>
              <UtilityIconButton
                icon={theme === "dark" ? <SunMedium size={15} /> : <MoonStar size={15} />}
                label="Toggle theme"
                onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              />
              <UtilityIconButton icon={<ShoppingBag size={15} />} label="Open cart panel" onClick={() => openRightPanel("cart")} />
            </div>
          </header>

          <div className="flex min-h-0 flex-1">
            <div
              ref={mainScrollRef}
              onScroll={updateAutoScrollState}
              className="min-h-0 flex-1 overflow-y-auto px-0.5 pr-1.5 pt-0.5 md:px-0 md:pr-2 md:pt-0"
            >
            <main className="main-stage flex min-h-full min-w-0 flex-col overflow-hidden rounded-[1.6rem]">
              <div className="min-h-0 flex-1 px-3 pb-36 pt-2 md:px-6 md:pb-32 md:pt-5 xl:px-6">
                {showHero ? (
                  <section className="flex min-h-full w-full flex-col justify-start py-2 md:py-4">
                    <div className="grid gap-4 md:gap-6">
                      <div className="rounded-[1.25rem] border border-border bg-surface px-4 py-5 shadow-[0_16px_40px_rgba(15,15,15,0.03)] md:rounded-[1.35rem] md:px-6 md:py-6">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{uiCopy.assistantLabel}</p>
                        <h1 className="mimo-serif mt-2 max-w-[10ch] text-[1.65rem] leading-[0.96] text-ink md:max-w-[16ch] md:text-[3.35rem]">
                          Shop Sri Lanka, thoughtfully.
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft md:text-[15px] md:leading-7">
                          A premium shopping workspace for gifts, groceries, order tracking, category browsing, and checkout without breaking the flow.
                        </p>

                        <div className="mt-5 grid grid-cols-2 gap-2 md:flex md:flex-wrap">
                          {quickActions.map((item) => (
                            <ActionChip key={item.label} icon={item.icon} label={item.label} onClick={item.action} />
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                        {suggestionActions.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={item.action}
                            className="rounded-[1.05rem] border border-border bg-surface px-3 py-3 text-left shadow-[0_12px_28px_rgba(15,15,15,0.025)] transition hover:border-border-hover hover:-translate-y-0.5 md:rounded-[1.15rem] md:px-4 md:py-4"
                          >
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Prompt idea</p>
                            <p className="mt-2 text-[13px] font-medium text-ink md:text-sm">{item.label}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>
                ) : activeView === "gift" ? (
                  <div className="flex min-h-full items-start justify-center py-1 md:items-center md:py-6">
                    <GiftAdvisor mode="inline" onSubmit={handleGiftAdvisorSubmit} />
                  </div>
                ) : activeView === "track" ? (
                  <div className="flex min-h-full items-start justify-center py-1 md:items-center md:py-6">
                    <TrackOrderPanel
                      tracking={trackingLookup || latestTracking}
                      isLoading={trackingLookupBusy}
                      onSubmit={handleTrackSubmit}
                      copy={pageCopy}
                    />
                  </div>
                ) : activeView === "categories" ? (
                  <WorkflowPanel
                    eyebrow={uiCopy.browseCategories}
                    title={pageCopy.categoriesTitle}
                    description={pageCopy.categoriesDescription}
                  >
                    <div className="rounded-[1.25rem] border border-border bg-surface p-4 shadow-[0_14px_34px_rgba(15,15,15,0.03)] md:rounded-[1.8rem] md:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-ink">{pageCopy.categoryBrowser}</p>
                          <p className="mt-1 text-sm text-ink-soft">{pageCopy.categoriesHelper}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void loadCategories()}
                          className="rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
                        >
                          {categoryLoading ? "Loading..." : pageCopy.loadCategories}
                        </button>
                      </div>

                      <div className="mt-5 grid grid-cols-4 gap-2 md:flex md:flex-wrap md:gap-3">
                        {categoryList.length ? (
                          categoryList.map((category) => (
                            <button
                              key={category.label}
                              type="button"
                              onClick={() => void loadCategoryProducts(category.label)}
                              className={`min-w-0 truncate rounded-full border px-2.5 py-2 text-xs ${
                                selectedCategory === category.label
                                  ? "border-accent bg-accent text-white"
                                  : "border-border bg-bg text-ink hover:border-border-hover"
                              } md:px-4 md:py-2.5 md:text-sm`}
                              title={category.label}
                            >
                              {category.label}
                            </button>
                          ))
                        ) : (
                          <div className="col-span-4 rounded-[1rem] border border-dashed border-border bg-surface-2 px-4 py-8 text-sm text-ink-soft">
                            {pageCopy.noCategories}
                          </div>
                        )}
                      </div>

                      {categoryError ? (
                        <div className="mt-4 rounded-[1rem] border border-red-500/30 bg-red-500/8 px-4 py-3 text-sm text-danger">
                          {categoryError}
                        </div>
                      ) : null}

                      {selectedCategory ? (
                        <div className="mt-6 border-t border-border pt-6">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-ink">{selectedCategory}</p>
                              <p className="mt-1 text-sm text-ink-soft">{pageCopy.categoryFlow}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => dispatchPrompt(`Help me choose the best ${selectedCategory} item for my needs`, "chat")}
                              className="rounded-2xl border border-border bg-bg px-4 py-2.5 text-sm font-medium text-ink hover:border-border-hover"
                            >
                              {pageCopy.askCategoryAi}
                            </button>
                          </div>

                          <div className="mt-5">
                            {categoryProducts.length ? (
                              <CatalogRail products={categoryProducts} sessionId={sessionId} onAdded={refresh} />
                            ) : categoryProductsLoading ? (
                              <div className="rounded-[1rem] border border-dashed border-border bg-surface-2 px-4 py-8 text-sm text-ink-soft">
                                {pageCopy.categoryLoading(selectedCategory)}
                              </div>
                            ) : (
                              <div className="rounded-[1rem] border border-dashed border-border bg-surface-2 px-4 py-8 text-sm text-ink-soft">
                                {pageCopy.categoryPrompt}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </WorkflowPanel>
                ) : activeView === "offers" ? (
                  <WorkflowPanel
                    eyebrow={pageCopy.offers}
                    title={pageCopy.offersTitle}
                    description={pageCopy.offersDescription}
                  >
                    <div className="rounded-[1.25rem] border border-border bg-surface p-4 shadow-[0_14px_34px_rgba(15,15,15,0.03)] md:rounded-[1.8rem] md:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-ink">{pageCopy.offersLoader}</p>
                          <p className="mt-1 text-sm text-ink-soft">{pageCopy.offersHelper}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void loadOffers()}
                          className="rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
                        >
                          {offersLoading ? "Loading..." : pageCopy.loadOffers}
                        </button>
                      </div>

                      {offersError ? (
                        <div className="mt-4 rounded-[1rem] border border-red-500/30 bg-red-500/8 px-4 py-3 text-sm text-danger">
                          {offersError}
                        </div>
                      ) : null}

                      <div className="mt-6">
                        {offerProducts.length ? (
                          <CatalogRail products={offerProducts} sessionId={sessionId} onAdded={refresh} />
                        ) : offersLoading ? (
                          <div className="rounded-[1rem] border border-dashed border-border bg-surface-2 px-4 py-8 text-sm text-ink-soft">
                            {pageCopy.offersLoading}
                          </div>
                        ) : (
                          <div className="rounded-[1rem] border border-dashed border-border bg-surface-2 px-4 py-8 text-sm text-ink-soft">
                            {pageCopy.noOffers}
                          </div>
                        )}
                      </div>
                    </div>
                  </WorkflowPanel>
                ) : (
                  <div className="flex w-full flex-col gap-4 md:gap-5">
                    {messages.map((msg) => (
                      <ChatMessage
                        key={msg.id}
                        message={msg}
                        sessionId={sessionId}
                        onAdded={refresh}
                        language={uiLanguage}
                        ttsApiEnabled={Boolean(backendMeta?.tts.configured)}
                        isStreaming={isStreaming && msg.id === messages[messages.length - 1]?.id && msg.role === "assistant"}
                      />
                    ))}
                  </div>
                )}

                {trackingLookupError ? (
                  <div className="mt-6 flex justify-center">
                    <span className="rounded-full border border-red-500/30 bg-red-500/8 px-4 py-2 text-sm text-danger">{trackingLookupError}</span>
                  </div>
                ) : null}

                {error ? (
                  <div className="mt-6 flex justify-center">
                    <span className="rounded-full border border-red-500/30 bg-red-500/8 px-4 py-2 text-sm text-danger">{error}</span>
                  </div>
                ) : null}

                <div ref={messagesEndRef} />
              </div>

              {showComposer ? (
                <div className="pointer-events-none fixed inset-x-3 bottom-3 z-30 sm:inset-x-4 lg:bottom-3 lg:left-[calc(14rem+0.15rem)] lg:right-[calc(20.5rem+0.15rem)]">
                  <div className="flex w-full flex-col gap-3">
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        submitCurrentMessage();
                      }}
                      className="pointer-events-auto flex items-end gap-1.5 rounded-[1.1rem] border border-border bg-surface px-2.5 py-2 shadow-[0_10px_24px_rgba(15,15,15,0.16)] md:gap-2 md:rounded-[1.2rem] md:border md:border-border/80 md:bg-surface md:px-3 md:py-2.5 md:shadow-none"
                    >
                      <button
                        type="button"
                        onClick={() => activateView("gift")}
                        className="hidden h-9 shrink-0 items-center gap-2 rounded-full border border-border bg-surface-2 px-3 text-[13px] font-medium text-ink-soft hover:text-ink md:inline-flex"
                      >
                        <Gift size={16} />
                        <span>{uiCopy.giftAdvisor}</span>
                      </button>
                      <textarea
                        ref={composerTextareaRef}
                        value={input}
                        rows={1}
                        onChange={(event) => {
                          setInput(event.target.value);
                          resizeComposer();
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            submitCurrentMessage();
                          }
                        }}
                        placeholder={uiCopy.inputPlaceholder}
                        disabled={isStreaming}
                        className="composer-textarea min-h-[2.25rem] max-h-16 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-1 py-1 text-[14px] leading-5 text-ink outline-none placeholder:text-muted disabled:opacity-40 md:text-sm"
                      />
                      <button
                        type="button"
                        onClick={toggleListening}
                        disabled={isStreaming || !voiceInputSupported}
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border md:h-10 md:w-10 ${
                          micActive
                            ? "border-accent bg-accent text-white"
                            : "border-border bg-surface text-ink-soft hover:border-border-hover hover:text-ink"
                        } disabled:cursor-not-allowed disabled:opacity-40`}
                        aria-label={micActive ? "Stop voice input" : "Start voice input"}
                        title={voiceInputSupported ? (micActive ? "Stop voice input" : "Start voice input") : "Voice input not supported in this browser"}
                      >
                        <Mic size={18} />
                      </button>
                      <button
                        type="submit"
                        disabled={isStreaming}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white shadow-[0_12px_24px_rgba(200,105,58,0.25)] hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40 md:h-10 md:w-10"
                        aria-label="Send message"
                      >
                        <SendHorizontal size={18} />
                      </button>
                    </form>
                  </div>
                </div>
              ) : null}
            </main>
            </div>
          </div>
        </div>

        <aside className="hidden min-h-0 lg:flex lg:flex-col">
          <div className="glass-panel flex min-h-0 flex-1 flex-col rounded-[1.6rem] overflow-hidden">
            <div className="border-b border-border px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-ink">
                    {desktopPanel === "checkout" ? "Checkout overview" : uiCopy.cart}
                  </h2>
                  <p className="mt-1 text-sm text-ink-soft">
                    {desktopPanel === "checkout"
                      ? CHECKOUT_PANEL_SUBTITLE
                      : pageCopy.cartSummary(cartCount)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDesktopPanel(desktopPanel === "cart" ? "checkout" : "cart")}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-ink-soft hover:border-border-hover hover:text-ink"
                >
                  {desktopPanel === "cart" ? "Checkout" : "Cart"}
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 rounded-[1rem] border border-border bg-surface p-1">
                <button
                  type="button"
                  onClick={() => setDesktopPanel("cart")}
                  className={`rounded-full px-3 py-2 text-sm font-medium ${
                    desktopPanel === "cart" ? "bg-accent text-white" : "text-ink-soft"
                  }`}
                >
                  Cart
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopPanel("checkout")}
                  className={`rounded-full px-3 py-2 text-sm font-medium ${
                    desktopPanel === "checkout" ? "bg-accent text-white" : "text-ink-soft"
                  }`}
                >
                  Checkout
                </button>
              </div>
            </div>

            {desktopPanel === "checkout" ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4">
                  <CheckoutSummaryCard
                    recipientName={cart.recipient?.name}
                    deliveryCity={cart.delivery?.city}
                    senderName={cart.sender?.name}
                    total={total}
                    itemCount={cartCount}
                    onEdit={openCheckout}
                  />
                  {panelOrder ? <PayLinkCard order={panelOrder} /> : null}
                </div>
                <CheckoutPanelFooter
                  error={checkoutError}
                  actionLabel={checkoutActionLabel}
                  actionHref={panelOrder?.payment_url || undefined}
                  actionDisabled={cartCount === 0 || placingOrder}
                  onAction={handlePanelCheckout}
                  panelTone="surface"
                  compactTopSpacing
                />
              </div>
            ) : (
              <Cart
                cart={cart}
                total={total}
                onUpdateQuantity={updateQuantity}
                onRemove={removeItem}
                onCheckout={() => setDesktopPanel("checkout")}
                budgetDraft={budgetValue}
                budgetSaving={budgetSaving}
                onBudgetDraftChange={setBudgetDraft}
                onBudgetSubmit={handleBudgetSubmit}
                onBudgetClear={handleBudgetClear}
                checkoutLabel="Proceed to checkout"
              />
            )}
          </div>
        </aside>
        </div>
      </div>

      {rightPanel ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
            aria-label="Close side panel"
            onClick={() => setRightPanel(null)}
          />

          <aside className="fixed inset-0 z-50 flex flex-col transition-opacity duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] opacity-100 lg:hidden">
            <div className="glass-panel flex h-full min-h-0 flex-col rounded-none px-5 py-5 transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] translate-y-0">
          <div className="drawer-item drawer-delay-1 mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">
                {rightPanel === "checkout" ? "Checkout overview" : uiCopy.cart}
              </h2>
              <p className="text-sm text-ink-soft">
                {rightPanel === "checkout"
                  ? CHECKOUT_PANEL_SUBTITLE
                  : pageCopy.cartSummary(cartCount)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRightPanel(null)}
              className="icon-button-compact text-ink-soft"
              aria-label="Close cart panel"
            >
              <X size={18} />
            </button>
          </div>

          <div className="drawer-item drawer-delay-2 mb-4 grid grid-cols-2 gap-2 rounded-[1rem] border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => setRightPanel("cart")}
              className={`rounded-full px-3 py-2 text-sm font-medium ${
                rightPanel === "cart" ? "bg-accent text-white" : "text-ink-soft"
              }`}
            >
              Cart
            </button>
            <button
              type="button"
              onClick={() => setRightPanel("checkout")}
              className={`rounded-full px-3 py-2 text-sm font-medium ${
                rightPanel === "checkout" ? "bg-accent text-white" : "text-ink-soft"
              }`}
            >
              Checkout
            </button>
          </div>

          {rightPanel === "checkout" ? (
            <div className="drawer-item drawer-delay-3 flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <CheckoutSummaryCard
                  recipientName={cart.recipient?.name}
                  deliveryCity={cart.delivery?.city}
                  senderName={cart.sender?.name}
                  total={total}
                  itemCount={cartCount}
                  onEdit={openCheckout}
                />
                {panelOrder ? <PayLinkCard order={panelOrder} /> : null}
              </div>
              <CheckoutPanelFooter
                error={checkoutError}
                actionLabel={checkoutActionLabel}
                actionHref={panelOrder?.payment_url || undefined}
                actionDisabled={cartCount === 0 || placingOrder}
                onAction={handlePanelCheckout}
                panelTone="surface"
                compactTopSpacing
              />
            </div>
          ) : (
            <div className="drawer-item drawer-delay-3 min-h-0 flex-1 overflow-hidden">
              <Cart
                cart={cart}
                total={total}
                onUpdateQuantity={updateQuantity}
                onRemove={removeItem}
                onCheckout={() => setRightPanel("checkout")}
                budgetDraft={budgetValue}
                budgetSaving={budgetSaving}
                onBudgetDraftChange={setBudgetDraft}
                onBudgetSubmit={handleBudgetSubmit}
                onBudgetClear={handleBudgetClear}
                checkoutLabel="Proceed to checkout"
              />
            </div>
          )}
            </div>
          </aside>
        </>
      ) : null}

      {showCheckout ? (
        <CheckoutDrawer
          key={[
            cart.recipient?.name || "",
            cart.recipient?.phone || "",
            cart.delivery?.address || "",
            cart.delivery?.city || "",
            cart.delivery?.date || "",
            cart.sender?.name || "",
            cart.gift_message || "",
          ].join("|")}
          open={showCheckout}
          cart={cart}
          total={total}
          onClose={() => setShowCheckout(false)}
          onSubmit={handleCheckoutSubmit}
          isSaving={checkoutSaving}
          error={checkoutError}
        />
      ) : null}
      {showNav ? (
        <MobileDrawer
          activeView={activeView}
          onChange={activateView}
          onClose={() => setShowNav(false)}
          voiceInputSupported={voiceInputSupported}
          voiceRepliesSupported={voiceRepliesSupported}
          voiceRepliesEnabled={isAssistantSpeaking}
          isListening={isListening}
          isStreaming={isStreaming}
          onToggleListening={toggleListening}
          onToggleVoiceReplies={toggleLatestAssistantSpeech}
          onNewChat={handleNewChat}
          copy={pageCopy}
          giftAdvisorLabel={uiCopy.giftAdvisor}
          trackOrderLabel={uiCopy.trackOrder}
          browseCategoriesLabel={uiCopy.browseCategories}
        />
      ) : null}
    </div>
  );
}
