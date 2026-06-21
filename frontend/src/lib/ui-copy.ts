"use client";

export type UiLanguage = "en" | "si" | "ta";

type Suggestion = {
  label: string;
  prompt: string;
};

type UiCopy = {
  appName: string;
  assistantLabel: string;
  heroTitle: string;
  heroDescription: string;
  heroExample: string;
  capabilityGiftTitle: string;
  capabilityGiftBody: string;
  capabilityTrackingTitle: string;
  capabilityTrackingBody: string;
  capabilityCheckoutTitle: string;
  capabilityCheckoutBody: string;
  openGiftAdvisor: string;
  trackMyOrder: string;
  browseCategories: string;
  openCheckout: string;
  cart: string;
  giftAdvisor: string;
  birthdayGifts: string;
  anniversaryGifts: string;
  trackOrder: string;
  showCategories: string;
  inputPlaceholder: string;
  suggestions: Suggestion[];
};

const copy: Record<UiLanguage, UiCopy> = {
  en: {
    appName: "KaprukaAI",
    assistantLabel: "Shopping assistant",
    heroTitle: "Shop with an AI assistant",
    heroDescription: "Discover products in chat, track orders, and move into checkout without leaving the conversation.",
    heroExample: "Try: help me restock my weekly groceries",
    capabilityGiftTitle: "Gift Picks",
    capabilityGiftBody: "Use the advisor or jump straight into birthday, anniversary, and grocery prompts.",
    capabilityTrackingTitle: "Order Tracking",
    capabilityTrackingBody: "Ask for a tracking update anytime and the assistant will prompt for the order number if needed.",
    capabilityCheckoutTitle: "Checkout Flow",
    capabilityCheckoutBody: "Save delivery details in the side drawer, then come back to chat for order placement and payment.",
    openGiftAdvisor: "Open Gift Advisor",
    trackMyOrder: "Track My Order",
    browseCategories: "Browse Categories",
    openCheckout: "Open Checkout",
    cart: "Cart",
    giftAdvisor: "Gift advisor",
    birthdayGifts: "Birthday gifts",
    anniversaryGifts: "Anniversary gifts",
    trackOrder: "Track order",
    showCategories: "Show categories",
    inputPlaceholder: "Search products, ask for recommendations...",
    suggestions: [
      { label: "Restock groceries", prompt: "Help me restock weekly groceries on Kapruka" },
      { label: "Birthday cake", prompt: "Find birthday cakes on Kapruka under Rs. 10,000" },
      { label: "Send flowers", prompt: "I want to send flowers to someone special" },
      { label: "Party supplies", prompt: "Show party supplies for 10 people" },
    ],
  },
  si: {
    appName: "KaprukaAI",
    assistantLabel: "සාප්පු සහායක",
    heroTitle: "AI සහායකයෙක් සමඟ සාප්පු යන්න",
    heroDescription: "චැට් එකෙන් නිෂ්පාදන සොයන්න, ඇණවුම් ලුහුබඳින්න, සහ conversation එකෙන්ම checkout වෙන්න.",
    heroExample: "උදාහරණයක්: මගේ සතිපතා groceries නැවත ගන්න උදව් කරන්න",
    capabilityGiftTitle: "තෑගි අදහස්",
    capabilityGiftBody: "Gift Advisor එකෙන් පටන් ගන්න, නැත්නම් birthday, anniversary, grocery prompts වලටම යන්න.",
    capabilityTrackingTitle: "ඇණවුම් ලුහුබැඳීම",
    capabilityTrackingBody: "ඕනෑම වෙලාවක tracking update එකක් අහන්න. අවශ්‍ය නම් order number එක ඉල්ලයි.",
    capabilityCheckoutTitle: "Checkout Flow",
    capabilityCheckoutBody: "Delivery details side drawer එකේ save කරලා, payment සහ order placement සඳහා chat එකට ආපහු එන්න.",
    openGiftAdvisor: "Gift Advisor අරඹන්න",
    trackMyOrder: "මගේ ඇණවුම ලුහුබඳින්න",
    browseCategories: "කාණ්ඩ බලන්න",
    openCheckout: "Checkout අරින්න",
    cart: "Cart",
    giftAdvisor: "Gift advisor",
    birthdayGifts: "උපන්දින තෑගි",
    anniversaryGifts: "සංවත්සර තෑගි",
    trackOrder: "Track order",
    showCategories: "කාණ්ඩ පෙන්වන්න",
    inputPlaceholder: "නිෂ්පාදන සොයන්න, recommendations අහන්න...",
    suggestions: [
      { label: "Groceries නැවත ගන්න", prompt: "Kapruka එකෙන් මගේ සතිපතා groceries නැවත ගන්න උදව් කරන්න" },
      { label: "Birthday cake", prompt: "රු. 10,000ට අඩු birthday cakes Kapruka එකෙන් හොයන්න" },
      { label: "මල් යවන්න", prompt: "කෙනෙකුට flowers යවන්න ඕන" },
      { label: "Party supplies", prompt: "10 දෙනෙකුට party supplies පෙන්නන්න" },
    ],
  },
  ta: {
    appName: "KaprukaAI",
    assistantLabel: "ஷாப்பிங் உதவியாளர்",
    heroTitle: "AI உதவியாளருடன் வாங்குங்கள்",
    heroDescription: "அரட்டையிலேயே பொருட்கள் தேடுங்கள், order track செய்யுங்கள், checkout-க்கும் அங்கிருந்தே செல்லுங்கள்.",
    heroExample: "உதாரணம்: என் வாராந்த groceries மீண்டும் வாங்க உதவி செய்",
    capabilityGiftTitle: "பரிசு தேர்வுகள்",
    capabilityGiftBody: "Gift Advisor-இல் தொடங்கலாம், இல்லையெனில் birthday, anniversary, grocery prompts-க்கு நேராக செல்லலாம்.",
    capabilityTrackingTitle: "ஆர்டர் கண்காணிப்பு",
    capabilityTrackingBody: "எப்போதும் tracking update கேளுங்கள். தேவைப்பட்டால் order number கேட்கும்.",
    capabilityCheckoutTitle: "Checkout Flow",
    capabilityCheckoutBody: "Delivery details-ஐ side drawer-இல் save செய்து, payment மற்றும் order placement காக மீண்டும் chat-க்கு வாருங்கள்.",
    openGiftAdvisor: "Gift Advisor திறக்க",
    trackMyOrder: "என் order-ஐ track செய்",
    browseCategories: "Categories பாருங்கள்",
    openCheckout: "Checkout திறக்க",
    cart: "Cart",
    giftAdvisor: "Gift advisor",
    birthdayGifts: "பிறந்தநாள் பரிசுகள்",
    anniversaryGifts: "ஆண்டுவிழா பரிசுகள்",
    trackOrder: "Track order",
    showCategories: "Categories காட்டு",
    inputPlaceholder: "பொருட்கள் தேடுங்கள், recommendations கேளுங்கள்...",
    suggestions: [
      { label: "Groceries மீண்டும் வாங்க", prompt: "Kapruka-வில் என் வாராந்த groceries மீண்டும் வாங்க உதவி செய்" },
      { label: "Birthday cake", prompt: "Rs. 10,000க்கு குறைவான birthday cakes Kapruka-வில் காண்பி" },
      { label: "Flowers அனுப்பு", prompt: "ஒருவருக்கு flowers அனுப்ப வேண்டும்" },
      { label: "Party supplies", prompt: "10 பேருக்கு party supplies காட்டு" },
    ],
  },
};

export function detectUiLanguage(locale?: string): UiLanguage {
  const normalized = (locale || "").toLowerCase();
  if (normalized.startsWith("si")) return "si";
  if (normalized.startsWith("ta")) return "ta";
  return "en";
}

export function getUiCopy(language: UiLanguage): UiCopy {
  return copy[language] || copy.en;
}
