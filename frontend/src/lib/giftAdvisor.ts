export type GiftAdvisorChoice = {
  label: string;
  value: string;
};

export type GiftAdvisorAnswers = {
  recipient: GiftAdvisorChoice | null;
  budget: GiftAdvisorChoice | null;
  occasion: GiftAdvisorChoice | null;
};

export const giftAdvisorSteps = [
  {
    key: "recipient",
    title: "Who is the gift for?",
    helper: "Pick the closest match. We will turn it into a better shopping prompt.",
    choices: [
      { label: "Parent", value: "my parent" },
      { label: "Partner", value: "my partner" },
      { label: "Friend", value: "my friend" },
      { label: "Colleague", value: "my colleague" },
      { label: "Child", value: "a child" },
      { label: "Myself", value: "myself" },
    ],
  },
  {
    key: "budget",
    title: "What budget should we stay near?",
    helper: "The prompt asks the assistant to stay inside this range when possible.",
    choices: [
      { label: "Under Rs. 2,500", value: "under Rs. 2,500" },
      { label: "Rs. 2,500 to 5,000", value: "between Rs. 2,500 and Rs. 5,000" },
      { label: "Rs. 5,000 to 10,000", value: "between Rs. 5,000 and Rs. 10,000" },
      { label: "Rs. 10,000+", value: "above Rs. 10,000" },
    ],
  },
  {
    key: "occasion",
    title: "What is the occasion?",
    helper: "This helps bias the search toward a better kind of gift.",
    choices: [
      { label: "Birthday", value: "a birthday" },
      { label: "Anniversary", value: "an anniversary" },
      { label: "Thank you", value: "a thank-you gift" },
      { label: "New baby", value: "a newborn celebration" },
      { label: "Housewarming", value: "a housewarming" },
      { label: "Just because", value: "a thoughtful surprise" },
    ],
  },
] as const;

export function createEmptyGiftAdvisorAnswers(): GiftAdvisorAnswers {
  return {
    recipient: null,
    budget: null,
    occasion: null,
  };
}

export function buildGiftAdvisorPrompt(answers: GiftAdvisorAnswers): string {
  const recipient = answers.recipient?.value || "someone special";
  const budget = answers.budget?.value || "a reasonable budget";
  const occasion = answers.occasion?.value || "a meaningful moment";

  return [
    "Help me choose a gift on Kapruka.",
    `It is for ${recipient}.`,
    `The occasion is ${occasion}.`,
    `Keep it ${budget}.`,
    "Search Kapruka and show 3 to 6 strong matches as product cards.",
    "Keep the text concise, recommend the single best option first, and do not exceed the budget unless you clearly label it as a stretch option.",
  ].join(" ");
}
