"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  AudioLines,
  Gift,
  Grid2x2,
  Home,
  Menu,
  Mic,
  Package,
  Search,
  SendHorizontal,
  ShoppingBag,
  Sparkles,
  Tag,
  Truck,
  X,
} from "lucide-react";
import Cart from "@/components/Cart";
import ChatMessage from "@/components/ChatMessage";
import CheckoutDrawer from "@/components/CheckoutDrawer";
import GiftAdvisor from "@/components/GiftAdvisor";
import ProductCard from "@/components/ProductCard";
import StatusModal from "@/components/StatusModal";
import TrackingCard from "@/components/TrackingCard";
import { useCart } from "@/hooks/useCart";
import { type Message, useChat } from "@/hooks/useChat";
import {
  getBackendMeta,
  type BackendMeta,
  streamChat,
  type CheckoutInfoPayload,
  type ProductSummary,
  type TrackingSummary,
  updateBudget,
  updateCheckoutInfo,
} from "@/lib/api";
import { parseChatCommand } from "@/lib/chat-command";
import {
  createRecognition,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  speakText,
  stopSpeaking,
  type RecognitionLike,
} from "@/lib/speech";
import { detectUiLanguage, getUiCopy, type UiLanguage } from "@/lib/ui-copy";

type ActiveView = "home" | "chat" | "gift" | "track" | "categories" | "offers";
type RightPanel = "cart" | "checkout" | null;
type CategoryOption = { label: string; href?: string };

function generateSessionId() {
  return `sess-${Math.random().toString(36).slice(2, 10)}`;
}

const SESSION_STORAGE_KEY = "kapruka.chat.session";
const SESSION_TTL_MS = 5 * 60 * 1000;
const VOICE_REPLY_STORAGE_KEY = "kapruka.chat.voiceReplies";

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

function loadVoiceRepliesEnabled() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(VOICE_REPLY_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function BrandMark() {
  return (
    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(180deg,#fff6ef,#f6dfd0)] text-accent shadow-[0_10px_28px_rgba(200,105,58,0.18)]">
      <Sparkles size={20} />
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
    <button type="button" className="app-sidebar-link text-sm font-medium" data-active={active} onClick={onClick}>
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
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[1.2rem] border border-border bg-white px-4 py-2.5 text-sm font-medium text-ink shadow-[0_10px_24px_rgba(88,54,30,0.05)] hover:-translate-y-0.5 hover:border-border-hover md:min-h-12 md:w-auto md:justify-start md:gap-3 md:rounded-full md:px-5 md:py-3"
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
      className={`grid h-11 w-11 place-items-center rounded-2xl border ${
        active ? "border-accent bg-accent text-white" : "border-border bg-white text-ink-soft hover:border-border-hover hover:text-ink"
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
    <section className="soft-panel rounded-[2rem] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-ink">Checkout Details</h3>
          <p className="mt-1 text-sm text-ink-soft">Saved delivery details for this cart session.</p>
        </div>
        <button type="button" onClick={onEdit} className="text-sm font-medium text-accent hover:text-accent-hover">
          Edit
        </button>
      </div>

      <div className="space-y-4 text-sm">
        <div className="rounded-2xl border border-border bg-white/90 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Deliver to</p>
          <p className="mt-2 font-medium text-ink">{recipientName || "Not saved yet"}</p>
          <p className="mt-1 text-ink-soft">{deliveryCity || "Add recipient and city"}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white/90 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Sender</p>
          <p className="mt-2 font-medium text-ink">{senderName || "Not saved yet"}</p>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-border bg-[linear-gradient(180deg,#fff7f1,#f6e2d2)] p-4">
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
  uiLanguage,
  onLanguageChange,
  voiceInputSupported,
  voiceRepliesSupported,
  voiceRepliesEnabled,
  isListening,
  isStreaming,
  onToggleListening,
  onToggleVoiceReplies,
  onNewChat,
}: {
  activeView: ActiveView;
  onChange: (view: ActiveView) => void;
  onClose: () => void;
  uiLanguage: UiLanguage;
  onLanguageChange: (language: UiLanguage) => void;
  voiceInputSupported: boolean;
  voiceRepliesSupported: boolean;
  voiceRepliesEnabled: boolean;
  isListening: boolean;
  isStreaming: boolean;
  onToggleListening: () => void;
  onToggleVoiceReplies: () => void;
  onNewChat: () => void;
}) {
  const items: { icon: React.ReactNode; label: string; view: ActiveView }[] = [
    { icon: <Home size={18} />, label: "Home", view: "home" },
    { icon: <Gift size={18} />, label: "Gift Advisor", view: "gift" },
    { icon: <Truck size={18} />, label: "Track Order", view: "track" },
    { icon: <Grid2x2 size={18} />, label: "Categories", view: "categories" },
    { icon: <Tag size={18} />, label: "Offers", view: "offers" },
  ];

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-[rgba(37,24,18,0.18)] backdrop-blur-[2px] lg:hidden"
        aria-label="Close navigation drawer"
        onClick={onClose}
      />
      <div className="glass-panel fixed inset-y-3 left-3 z-50 flex w-[min(84vw,22rem)] flex-col rounded-[2rem] p-4 lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <p className="mimo-serif text-[1.8rem] leading-none text-ink">Kapruka <span className="text-accent">AI</span></p>
              <p className="text-xs text-ink-soft">Sri Lanka&apos;s shopping assistant</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-white text-ink-soft"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 space-y-2">
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
            label="New chat"
            onClick={() => {
              onNewChat();
              onClose();
            }}
          />
        </div>

        <div className="mt-auto space-y-4">
          <div className="flex items-center gap-2">
            {voiceInputSupported ? (
              <UtilityIconButton
                icon={<Mic size={16} />}
                label={isListening ? "Stop voice input" : "Start voice input"}
                active={isListening}
                disabled={isStreaming}
                onClick={onToggleListening}
              />
            ) : null}
            {voiceRepliesSupported ? (
              <UtilityIconButton
                icon={<AudioLines size={16} />}
                label={voiceRepliesEnabled ? "Disable voice replies" : "Enable voice replies"}
                active={voiceRepliesEnabled}
                onClick={onToggleVoiceReplies}
              />
            ) : null}
          </div>
          <LanguageSwitch value={uiLanguage} onChange={onLanguageChange} />
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
}: {
  tracking: TrackingSummary | null;
  isLoading: boolean;
  onSubmit: (orderNumber: string) => void;
}) {
  const [orderNumber, setOrderNumber] = useState("");

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="rounded-[1.35rem] bg-white/90 p-4 md:rounded-[2rem] md:border md:border-border md:p-8 md:shadow-[0_14px_40px_rgba(37,36,31,0.05)]">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Track order</p>
        <h1 className="mimo-serif mt-2 text-[2rem] leading-[1.02] text-ink md:text-6xl">Check delivery status fast.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft md:text-base md:leading-7">
          Enter the Kapruka order number and get the latest tracking update without using the chat flow.
        </p>

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
            placeholder="Enter order number"
            className="h-12 flex-1 rounded-2xl border border-border bg-bg px-4 text-sm text-ink outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="h-12 rounded-2xl bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {isLoading ? "Checking..." : "Track order"}
          </button>
        </form>
      </div>

      {tracking ? (
        <TrackingCard tracking={tracking} />
      ) : (
        <div className="rounded-[1.8rem] border border-dashed border-border bg-white/80 px-6 py-10 text-center text-sm text-ink-soft">
          No tracking result yet. Enter an order number to load the latest update.
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
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="rounded-[1.35rem] bg-white/90 p-4 md:rounded-[2rem] md:border md:border-border md:p-8 md:shadow-[0_14px_40px_rgba(37,36,31,0.05)]">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{eyebrow}</p>
        <h1 className="mimo-serif mt-2 text-[2rem] leading-[1.02] text-ink md:text-6xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-soft md:text-base md:leading-7">{description}</p>
      </div>
      {children}
    </section>
  );
}

export default function HomePage() {
  const [sessionId] = useState(loadSessionId);
  const { messages, isStreaming, error, sendMessage, clearMessages } = useChat(sessionId);
  const { cart, total, updateQuantity, removeItem, refresh } = useCart(sessionId);
  const [backendMeta, setBackendMeta] = useState<BackendMeta | null>(null);
  const [input, setInput] = useState("");
  const [showNav, setShowNav] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanel>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [checkoutSaving, setCheckoutSaving] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSaved, setCheckoutSaved] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>("home");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [categoryProducts, setCategoryProducts] = useState<ProductSummary[]>([]);
  const [offerProducts, setOfferProducts] = useState<ProductSummary[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryProductsLoading, setCategoryProductsLoading] = useState(false);
  const [offersLoading, setOffersLoading] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>(() =>
    detectUiLanguage(typeof navigator === "undefined" ? "" : navigator.language)
  );
  const [voiceInputSupported] = useState(isSpeechRecognitionSupported);
  const [voiceRepliesSupported] = useState(isSpeechSynthesisSupported);
  const [voiceRepliesEnabled, setVoiceRepliesEnabled] = useState(loadVoiceRepliesEnabled);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const lastSpokenAssistantRef = useRef("");

  const uiCopy = getUiCopy(uiLanguage);
  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const categoryPrompt = CATEGORY_PROMPT[uiLanguage];
  const budgetValue = budgetDraft || (cart.budget_max != null ? String(cart.budget_max) : "");
  const latestTracking = useMemo(() => findLatestTracking(messages), [messages]);
  const fallbackCategoryList = useMemo(() => parseCategoriesFromMessages(messages), [messages]);
  const categoryList = categoryOptions.length ? categoryOptions : fallbackCategoryList;

  const dispatchPrompt = useCallback(
    (prompt: string, nextView: ActiveView = "chat") => {
      saveSessionId(sessionId);
      setActiveView(nextView);
      sendMessage(prompt);
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

    saveSessionId(sessionId);
    setActiveView("chat");
    sendMessage(nextMessage);
    setInput("");
  }, [input, isStreaming, sendMessage, sessionId]);

  useEffect(() => {
    saveSessionId(sessionId);
  }, [sessionId]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(VOICE_REPLY_STORAGE_KEY, voiceRepliesEnabled ? "1" : "0");
    } catch {
      // ignore
    }
    if (!voiceRepliesEnabled) stopSpeaking();
  }, [voiceRepliesEnabled]);

  useEffect(() => {
    if (!messages.length) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!voiceRepliesEnabled || isStreaming) return;
    const latestAssistant = [...messages].reverse().find(
      (message) => message.role === "assistant" && message.content.trim()
    );
    if (!latestAssistant) return;
    const signature = `${latestAssistant.id}:${latestAssistant.content}`;
    if (signature === lastSpokenAssistantRef.current) return;
    lastSpokenAssistantRef.current = signature;
    speakText(latestAssistant.content);
  }, [messages, isStreaming, voiceRepliesEnabled]);

  useEffect(() => {
    let active = true;
    getBackendMeta()
      .then((meta) => {
        if (active) setBackendMeta(meta);
      })
      .catch(() => {
        if (active) setBackendMeta(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const openCheckout = () => {
    setCheckoutSaved(false);
    setCheckoutError(null);
    setShowCheckout(true);
  };

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

  const openRightPanel = (panel: Exclude<RightPanel, null>) => {
    setRightPanel(panel);
  };

  const loadCategories = useCallback(async () => {
    setCategoryLoading(true);
    setCategoryError(null);
    try {
      let nextCategories: CategoryOption[] = [];
      for await (const event of streamChat(categoryPrompt, sessionId)) {
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
  }, [categoryPrompt, sessionId]);

  const loadCategoryProducts = useCallback(async (category: string) => {
    setSelectedCategory(category);
    setCategoryProductsLoading(true);
    setCategoryError(null);
    setCategoryProducts([]);
    try {
      for await (const event of streamChat(`Show popular ${category} products on Kapruka with prices`, sessionId)) {
        if (event.type === "tool_result" && event.products?.length) {
          setCategoryProducts(event.products);
        }
      }
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : "Failed to load products");
    } finally {
      setCategoryProductsLoading(false);
    }
  }, [sessionId]);

  const loadOffers = useCallback(async () => {
    setOffersLoading(true);
    setOffersError(null);
    try {
      let products: ProductSummary[] = [];
      for await (const event of streamChat("Show current Kapruka deals and offers with products and prices", sessionId)) {
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
  }, [sessionId]);

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
    setShowNav(false);
    setActiveView("home");
  };

  const handleTrackSubmit = (orderNumber: string) => {
    dispatchPrompt(`Track Kapruka order ${orderNumber}`, "track");
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = createRecognition("en-US");
    if (!recognition) return;
    recognitionRef.current = recognition;

    recognition.onresult = (event: {
      resultIndex: number;
      results: { [key: number]: { 0: { transcript: string }; isFinal: boolean }; length: number };
    }) => {
      let interim = "";
      let final = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0].transcript;
        if (result.isFinal) final += transcript;
        else interim += transcript;
      }

      const nextValue = (final || interim).trimStart();
      if (!nextValue) return;
      setInput(nextValue);
      if (final.trim()) {
        recognition.stop();
        setIsListening(false);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  };

  const quickActions = [
    { icon: <Gift size={18} />, label: uiCopy.openGiftAdvisor, action: () => activateView("gift") },
    { icon: <Truck size={18} />, label: uiCopy.trackMyOrder, action: () => activateView("track") },
    { icon: <Grid2x2 size={18} />, label: uiCopy.browseCategories, action: () => activateView("categories") },
    { icon: <Tag size={18} />, label: "Deals & Offers", action: () => activateView("offers") },
  ];

  const suggestionActions = uiCopy.suggestions.map((suggestion) => ({
    label: suggestion.label,
    action: () => dispatchPrompt(suggestion.prompt, "chat"),
  }));

  const showComposer = activeView === "home" || activeView === "chat";
  const showHero = activeView === "home" && messages.length === 0;

  return (
    <div className="page-glow h-screen overflow-hidden text-ink">
      <StatusModal
        open={showStatus}
        onClose={() => setShowStatus(false)}
        backendMeta={backendMeta}
        sessionId={sessionId}
        uiLanguage={uiLanguage}
        cartCount={cartCount}
        voiceInputSupported={voiceInputSupported}
        voiceRepliesEnabled={voiceRepliesEnabled}
        isListening={isListening}
      />

      {checkoutSaved ? (
        <div className="animate-pop-in fixed bottom-28 left-1/2 z-[85] w-[min(92vw,24rem)] -translate-x-1/2 rounded-[1.6rem] border border-[rgba(101,139,82,0.25)] bg-white/95 p-4 shadow-[0_20px_54px_rgba(65,38,19,0.16)]">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-[rgba(101,139,82,0.14)] text-success">
              <Package size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">Checkout details saved</p>
              <p className="mt-1 text-sm text-ink-soft">Your cart is ready for order review and payment.</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex h-full max-w-[1720px] gap-4 px-3 py-3 md:px-5 md:py-4">
        <aside className="glass-panel hidden w-[280px] shrink-0 rounded-[2rem] p-5 lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <div className="flex items-baseline gap-1 text-[2rem] leading-none">
                <span className="mimo-serif text-ink">Kapruka</span>
                <span className="mimo-serif text-accent">AI</span>
              </div>
              <p className="mt-1 text-sm text-ink-soft">Sri Lanka&apos;s shopping assistant</p>
            </div>
          </div>

          <div className="mt-8 space-y-2">
            <SidebarLink icon={<Home size={18} />} label="Home" active={activeView === "home"} onClick={() => activateView("home")} />
            <SidebarLink icon={<Gift size={18} />} label="Gift Advisor" active={activeView === "gift"} onClick={() => activateView("gift")} />
            <SidebarLink icon={<Truck size={18} />} label="Track Order" active={activeView === "track"} onClick={() => activateView("track")} />
            <SidebarLink icon={<Grid2x2 size={18} />} label="Browse Categories" active={activeView === "categories"} onClick={() => activateView("categories")} />
            <SidebarLink icon={<Tag size={18} />} label="Deals & Offers" active={activeView === "offers"} onClick={() => activateView("offers")} />
            <SidebarLink icon={<Search size={18} />} label="New chat" onClick={handleNewChat} />
          </div>

          <div className="mt-auto space-y-4">
            <div className="soft-panel rounded-[1.6rem] p-4">
              <p className="text-sm font-semibold text-ink">Kapruka Rewards</p>
              <p className="mt-1 text-sm text-accent">Gold Member</p>
              <p className="mt-4 text-2xl font-semibold text-ink">12,450 pts</p>
            </div>
            <div className="rounded-[1.6rem] border border-border bg-white/70 px-4 py-3">
              <p className="text-sm font-semibold text-ink">{cart.recipient?.name || "Nadeesha"}</p>
              <p className="mt-1 text-sm text-ink-soft">{cart.delivery?.city || "Gold Member"}</p>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <header className="flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-white text-ink"
                onClick={() => setShowNav(true)}
                aria-label="Open navigation drawer"
              >
                <Menu size={18} />
              </button>
              <div className="flex items-center gap-2 rounded-[1.25rem] border border-border bg-white px-3 py-2">
                <BrandMark />
                <div>
                  <p className="mimo-serif text-[1.45rem] leading-none text-ink">Kapruka <span className="text-accent">AI</span></p>
                  <p className="text-[11px] leading-tight text-ink-soft">Sri Lanka&apos;s shopping assistant</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openRightPanel("cart")}
                className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-white text-ink"
                aria-label="Open cart panel"
              >
                <ShoppingBag size={18} />
              </button>
            </div>

            <div className="ml-auto hidden items-center gap-2 lg:flex">
              <LanguageSwitch value={uiLanguage} onChange={setUiLanguage} />
              {voiceInputSupported ? (
                <UtilityIconButton
                  icon={<Mic size={18} />}
                  label={isListening ? "Stop voice input" : "Start voice input"}
                  active={isListening}
                  disabled={isStreaming}
                  onClick={toggleListening}
                />
              ) : null}
              {voiceRepliesSupported ? (
                <UtilityIconButton
                  icon={<AudioLines size={18} />}
                  label={voiceRepliesEnabled ? "Disable voice replies" : "Enable voice replies"}
                  active={voiceRepliesEnabled}
                  onClick={() => setVoiceRepliesEnabled((current) => !current)}
                />
              ) : null}
              <button
                type="button"
                onClick={() => openRightPanel("cart")}
                className="relative inline-flex h-11 items-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-medium text-ink"
              >
                <ShoppingBag size={18} className="text-accent" />
                <span>{uiCopy.cart}</span>
                {cartCount > 0 ? <span className="grid h-6 min-w-6 place-items-center rounded-full bg-accent px-1.5 text-xs font-semibold text-white">{cartCount}</span> : null}
              </button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1">
            <main className="flex min-w-0 flex-1 flex-col rounded-[2rem] bg-white/72 shadow-[0_14px_40px_rgba(37,36,31,0.05)] ring-1 ring-[rgba(230,214,200,0.72)] lg:glass-panel lg:shadow-none lg:ring-0">
              <div className="flex-1 overflow-y-auto px-3 pb-4 pt-4 md:px-8 md:pb-6 md:pt-6">
                {showHero ? (
                  <section className="mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center px-1 text-center">
                    <p className="text-xs text-ink-soft md:text-sm">{uiCopy.assistantLabel}</p>
                    <h1 className="mimo-serif mt-2 max-w-4xl text-[1.9rem] leading-[0.98] text-ink sm:mt-4 sm:text-[4rem] lg:text-[5.3rem]">
                      Shop Sri Lanka,
                      <br />
                      thoughtfully.
                    </h1>
                    <div className="hero-divider my-4 md:my-5" />
                    <p className="max-w-2xl text-sm leading-7 text-ink-soft md:text-lg">
                      Hi. I&apos;m Kapruka AI. I can help you discover gifts, browse categories, track orders, and move into checkout without losing the conversation.
                    </p>

                    <div className="mt-5 grid w-full max-w-md grid-cols-2 gap-2 md:mt-7 md:flex md:max-w-none md:flex-wrap md:justify-center md:gap-3">
                      {quickActions.map((item) => (
                        <ActionChip key={item.label} icon={item.icon} label={item.label} onClick={item.action} />
                      ))}
                    </div>

                    <div className="mt-5 w-full max-w-md rounded-[1.35rem] bg-[linear-gradient(180deg,rgba(250,239,229,0.88),rgba(255,255,255,0.92))] px-5 py-4 md:mt-8 md:max-w-none md:rounded-[1.6rem] md:border md:border-[rgba(200,105,58,0.12)] md:px-6 md:py-5 md:shadow-[0_12px_30px_rgba(88,54,30,0.05)]">
                      <p className="text-base text-ink">Find a premium gift for a wedding under LKR 15,000</p>
                    </div>

                    <div className="mt-5 grid w-full max-w-md grid-cols-2 gap-2 md:mt-8 md:flex md:max-w-none md:flex-wrap md:justify-center md:gap-3">
                      {suggestionActions.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={item.action}
                          className="rounded-full border border-border bg-white px-3 py-2.5 text-sm text-ink-soft hover:border-border-hover hover:text-ink md:px-4"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </section>
                ) : activeView === "gift" ? (
                  <div className="flex min-h-full items-start justify-center py-1 md:items-center md:py-6">
                    <GiftAdvisor mode="inline" onSubmit={handleGiftAdvisorSubmit} />
                  </div>
                ) : activeView === "track" ? (
                  <div className="flex min-h-full items-start justify-center py-1 md:items-center md:py-6">
                    <TrackOrderPanel tracking={latestTracking} isLoading={isStreaming} onSubmit={handleTrackSubmit} />
                  </div>
                ) : activeView === "categories" ? (
                  <WorkflowPanel
                    eyebrow="Categories"
                    title="Browse by category, then shop inside it."
                    description="Pick a category first. Once selected, we load matching Kapruka products into this same view so browsing feels like a real shopping step instead of a chat detour."
                  >
                    <div className="rounded-[1.8rem] border border-border bg-white/90 p-6 shadow-[0_14px_40px_rgba(37,36,31,0.05)]">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-ink">Category browser</p>
                          <p className="mt-1 text-sm text-ink-soft">Categories are loaded from the live Kapruka category tool.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void loadCategories()}
                          className="rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
                        >
                          {categoryLoading ? "Loading..." : "Load categories"}
                        </button>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        {categoryList.length ? (
                          categoryList.map((category) => (
                            <button
                              key={category.label}
                              type="button"
                              onClick={() => void loadCategoryProducts(category.label)}
                              className={`rounded-full border px-4 py-2.5 text-sm ${
                                selectedCategory === category.label
                                  ? "border-accent bg-accent text-white"
                                  : "border-border bg-bg text-ink hover:border-border-hover"
                              }`}
                            >
                              {category.label}
                            </button>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-border bg-bg px-4 py-8 text-sm text-ink-soft">
                            No category tiles yet. Load categories first.
                          </div>
                        )}
                      </div>

                      {categoryError ? (
                        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
                          {categoryError}
                        </div>
                      ) : null}

                      {selectedCategory ? (
                        <div className="mt-6 border-t border-border pt-6">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-ink">{selectedCategory}</p>
                              <p className="mt-1 text-sm text-ink-soft">Expected flow: choose category, review products, then add to cart or continue the chat from that category context.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => dispatchPrompt(`Help me choose the best ${selectedCategory} item for my needs`, "chat")}
                              className="rounded-2xl border border-border bg-bg px-4 py-2.5 text-sm font-medium text-ink hover:border-border-hover"
                            >
                              Ask AI in this category
                            </button>
                          </div>

                          <div className="mt-5 grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-3">
                            {categoryProducts.length ? (
                              categoryProducts.map((product) => (
                                <ProductCard key={product.product_id} product={product} sessionId={sessionId} onAdded={refresh} />
                              ))
                            ) : categoryProductsLoading ? (
                              <div className="rounded-2xl border border-dashed border-border bg-bg px-4 py-8 text-sm text-ink-soft col-span-2 xl:col-span-3">
                                Loading products for {selectedCategory}...
                              </div>
                            ) : (
                              <div className="rounded-2xl border border-dashed border-border bg-bg px-4 py-8 text-sm text-ink-soft col-span-2 xl:col-span-3">
                                Choose a category to load products here.
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </WorkflowPanel>
                ) : activeView === "offers" ? (
                  <WorkflowPanel
                    eyebrow="Deals"
                    title="Current deals, shown as products first."
                    description="This section now loads the live assistant-backed deal results and renders them directly as product cards. The next expected step is simple: scan the deals, open a product, or add it to cart."
                  >
                    <div className="rounded-[1.8rem] border border-border bg-white/90 p-6 shadow-[0_14px_40px_rgba(37,36,31,0.05)]">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-ink">Offers loader</p>
                          <p className="mt-1 text-sm text-ink-soft">Live results from the current assistant and Kapruka catalog tools.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void loadOffers()}
                          className="rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
                        >
                          {offersLoading ? "Loading..." : "Load offers"}
                        </button>
                      </div>

                      {offersError ? (
                        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
                          {offersError}
                        </div>
                      ) : null}

                      <div className="mt-6 grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-3">
                        {offerProducts.length ? (
                          offerProducts.map((product) => (
                            <ProductCard
                              key={product.product_id || product.product_url || product.name}
                              product={product}
                              sessionId={sessionId}
                              onAdded={refresh}
                            />
                          ))
                        ) : offersLoading ? (
                          <div className="rounded-2xl border border-dashed border-border bg-bg px-4 py-8 text-sm text-ink-soft col-span-2 xl:col-span-3">
                            Loading current offers...
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-border bg-bg px-4 py-8 text-sm text-ink-soft col-span-2 xl:col-span-3">
                            No offer products loaded yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </WorkflowPanel>
                ) : (
                  <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => activateView("gift")}
                        className="rounded-full border border-border bg-[rgba(244,223,208,0.62)] px-4 py-2.5 text-sm font-medium text-accent hover:bg-[rgba(244,223,208,0.9)]"
                      >
                        {uiCopy.giftAdvisor}
                      </button>
                      <button
                        type="button"
                        onClick={() => activateView("track")}
                        className="rounded-full border border-border bg-white px-4 py-2.5 text-sm text-ink-soft hover:border-border-hover hover:text-ink"
                      >
                        {uiCopy.trackOrder}
                      </button>
                      <button
                        type="button"
                        onClick={() => activateView("categories")}
                        className="rounded-full border border-border bg-white px-4 py-2.5 text-sm text-ink-soft hover:border-border-hover hover:text-ink"
                      >
                        {uiCopy.showCategories}
                      </button>
                    </div>

                    {messages.map((msg) => (
                      <ChatMessage key={msg.id} message={msg} sessionId={sessionId} onAdded={refresh} />
                    ))}

                    {isStreaming && messages[messages.length - 1]?.role === "user" ? (
                      <div className="animate-fade-in flex justify-start">
                        <div className="rounded-[1.5rem] rounded-bl-md border border-border bg-white px-4 py-3 shadow-[0_12px_28px_rgba(88,54,30,0.05)]">
                          <div className="flex items-center gap-1.5">
                            <div className="typing-dot h-2 w-2 rounded-full bg-muted" />
                            <div className="typing-dot h-2 w-2 rounded-full bg-muted" />
                            <div className="typing-dot h-2 w-2 rounded-full bg-muted" />
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {error ? (
                  <div className="mt-6 flex justify-center">
                    <span className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm text-danger">{error}</span>
                  </div>
                ) : null}

                <div ref={messagesEndRef} />
              </div>

              {showComposer ? (
                <div className="border-t border-border/80 px-3 py-3 md:px-6 md:py-5">
                  <div className="mx-auto flex max-w-5xl flex-col gap-3">
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        submitCurrentMessage();
                      }}
                      className="flex items-center gap-2 rounded-[1.35rem] border border-border bg-white px-3 py-2.5 shadow-[0_14px_34px_rgba(88,54,30,0.06)] md:gap-3 md:rounded-[1.7rem] md:px-4 md:py-3"
                    >
                      <button
                        type="button"
                        onClick={() => activateView("gift")}
                        className="hidden h-12 shrink-0 items-center gap-2 rounded-full border border-border bg-surface-2 px-4 text-sm font-medium text-ink-soft hover:text-ink md:inline-flex"
                      >
                        <Gift size={16} />
                        <span>{uiCopy.giftAdvisor}</span>
                      </button>
                      <input
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            submitCurrentMessage();
                          }
                        }}
                        placeholder={uiCopy.inputPlaceholder}
                        disabled={isStreaming}
                        className="h-11 min-w-0 flex-1 bg-transparent px-1 text-sm text-ink outline-none placeholder:text-muted disabled:opacity-40 md:h-12"
                      />
                      <button
                        type="submit"
                        disabled={isStreaming}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-[1rem] bg-accent text-white shadow-[0_12px_24px_rgba(200,105,58,0.25)] hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40 md:h-12 md:w-12 md:rounded-2xl"
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

      {rightPanel ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[rgba(37,24,18,0.18)] backdrop-blur-[2px]"
          aria-label="Close side panel"
          onClick={() => setRightPanel(null)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-3 right-3 z-50 flex w-[min(92vw,25rem)] flex-col rounded-[2rem] py-2 transition-transform duration-300 ${
          rightPanel ? "translate-x-0" : "translate-x-[110%]"
        }`}
      >
        <div className="glass-panel flex h-full min-h-0 flex-col rounded-[2rem] px-4 py-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">
                {rightPanel === "checkout" ? "Checkout overview" : uiCopy.cart}
              </h2>
              <p className="text-sm text-ink-soft">
                {rightPanel === "checkout"
                  ? "Saved delivery details and order summary"
                  : `${cartCount} ${cartCount === 1 ? "item" : "items"} in your cart`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRightPanel(null)}
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-white text-ink-soft"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 rounded-[1.4rem] border border-border bg-white/80 p-1">
            <button
              type="button"
              onClick={() => setRightPanel("cart")}
              className={`rounded-[1rem] px-3 py-2 text-sm font-medium ${
                rightPanel === "cart" ? "bg-accent text-white" : "text-ink-soft"
              }`}
            >
              Cart
            </button>
            <button
              type="button"
              onClick={() => setRightPanel("checkout")}
              className={`rounded-[1rem] px-3 py-2 text-sm font-medium ${
                rightPanel === "checkout" ? "bg-accent text-white" : "text-ink-soft"
              }`}
            >
              Checkout
            </button>
          </div>

          {rightPanel === "checkout" ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
              <CheckoutSummaryCard
                recipientName={cart.recipient?.name}
                deliveryCity={cart.delivery?.city}
                senderName={cart.sender?.name}
                total={total}
                itemCount={cartCount}
                onEdit={openCheckout}
              />
              <div className="mt-auto pt-4">
                <button
                  type="button"
                  onClick={openCheckout}
                  className="w-full rounded-[1.15rem] bg-accent py-3 text-sm font-medium text-white hover:bg-accent-hover"
                >
                  Edit delivery details
                </button>
              </div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-hidden rounded-[1.6rem] border border-border bg-white/70">
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
              />
            </div>
          )}
        </div>
      </aside>

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
      {showNav ? (
        <MobileDrawer
          activeView={activeView}
          onChange={activateView}
          onClose={() => setShowNav(false)}
          uiLanguage={uiLanguage}
          onLanguageChange={setUiLanguage}
          voiceInputSupported={voiceInputSupported}
          voiceRepliesSupported={voiceRepliesSupported}
          voiceRepliesEnabled={voiceRepliesEnabled}
          isListening={isListening}
          isStreaming={isStreaming}
          onToggleListening={toggleListening}
          onToggleVoiceReplies={() => setVoiceRepliesEnabled((current) => !current)}
          onNewChat={handleNewChat}
        />
      ) : null}
    </div>
  );
}
