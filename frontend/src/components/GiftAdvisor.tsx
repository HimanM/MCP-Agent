"use client";

import { useEffect, useState } from "react";
import {
  buildGiftAdvisorPrompt,
  createEmptyGiftAdvisorAnswers,
  giftAdvisorSteps,
  type GiftAdvisorAnswers,
  type GiftAdvisorChoice,
} from "@/lib/giftAdvisor";

interface GiftAdvisorProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => void;
}

type StepKey = keyof GiftAdvisorAnswers;

export default function GiftAdvisor({ open, onClose, onSubmit }: GiftAdvisorProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<GiftAdvisorAnswers>(createEmptyGiftAdvisorAnswers);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setStepIndex(0);
      setAnswers(createEmptyGiftAdvisorAnswers());
      onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  const reset = () => {
    setStepIndex(0);
    setAnswers(createEmptyGiftAdvisorAnswers());
  };

  const close = () => {
    reset();
    onClose();
  };

  if (!open) return null;

  const step = giftAdvisorSteps[stepIndex];
  const isLastStep = stepIndex === giftAdvisorSteps.length - 1;

  const pickChoice = (choice: GiftAdvisorChoice) => {
    const nextAnswers = { ...answers, [step.key as StepKey]: choice };
    setAnswers(nextAnswers);

    if (!isLastStep) {
      setStepIndex((current) => current + 1);
      return;
    }

    onSubmit(buildGiftAdvisorPrompt(nextAnswers));
    reset();
  };

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-[2px]"
        onClick={close}
        aria-label="Close gift advisor"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Gift advisor"
        className="fixed inset-x-0 bottom-0 z-[80] mx-auto w-full max-w-2xl rounded-t-[2rem] border border-border bg-bg shadow-[0_-24px_80px_rgba(37,36,31,0.18)] md:bottom-8 md:rounded-[2rem]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5 md:px-7">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Gift advisor</p>
            <h2 className="mt-1 mimo-serif text-3xl text-ink">Find a stronger gift match</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
              A short guided flow inspired by the best candidate UIs, wired into your existing chat and product cards.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-surface text-ink-soft transition hover:border-border-hover hover:bg-surface-2 hover:text-ink"
            aria-label="Close gift advisor"
          >
            x
          </button>
        </div>

        <div className="px-5 pb-5 pt-4 md:px-7 md:pb-7">
          <div className="mb-5 flex gap-2">
            {giftAdvisorSteps.map((item, index) => (
              <div
                key={item.key}
                className={`h-1.5 flex-1 rounded-full transition ${
                  index <= stepIndex ? "bg-accent" : "bg-surface-3"
                }`}
              />
            ))}
          </div>

          <div className="rounded-[1.5rem] border border-border bg-surface p-4 md:p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">
              Step {stepIndex + 1} of {giftAdvisorSteps.length}
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-ink">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.helper}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {step.choices.map((choice) => (
                <button
                  key={choice.label}
                  type="button"
                  onClick={() => pickChoice(choice)}
                  className="group rounded-[1.25rem] border border-border bg-bg px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-border-hover hover:bg-surface-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{choice.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-ink-soft">{choice.value}</p>
                    </div>
                    <span className="mt-0.5 text-muted transition group-hover:text-accent">
                      {isLastStep ? "Go" : "Next"}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2 text-xs text-ink-soft">
                {answers.recipient ? (
                  <span className="rounded-full border border-border bg-bg px-3 py-1.5">{answers.recipient.label}</span>
                ) : null}
                {answers.budget ? (
                  <span className="rounded-full border border-border bg-bg px-3 py-1.5">{answers.budget.label}</span>
                ) : null}
                {answers.occasion ? (
                  <span className="rounded-full border border-border bg-bg px-3 py-1.5">{answers.occasion.label}</span>
                ) : null}
              </div>
              {stepIndex > 0 ? (
                <button
                  type="button"
                  onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                  className="text-sm text-ink-soft transition hover:text-ink"
                >
                  Back
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
