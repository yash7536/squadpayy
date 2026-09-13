import type { NudgeTone } from "./types";
import { formatCurrency } from "./format";

export interface NudgeToneOption {
  id: NudgeTone;
  label: string;
  description: string;
}

export const NUDGE_TONES: NudgeToneOption[] = [
  { id: "casual", label: "Casual", description: "Friendly, low-key, zero pressure" },
  { id: "direct", label: "Direct", description: "Clear, straight to the point, polite" },
  { id: "banter", label: "Banter", description: "Playful, inside-joke energy between buddies" },
];

interface NudgeContext {
  recipientFirstName: string;
  amount: number;
  billTitle: string;
  billDay?: string; // e.g. "Friday"
  link: string;
}

/** Builds the actual message text sent for a given tone. Pure + testable. */
export function buildNudgeMessage(tone: NudgeTone, ctx: NudgeContext): string {
  const amount = formatCurrency(ctx.amount);
  const day = ctx.billDay ? ` on ${ctx.billDay}` : "";

  switch (tone) {
    case "direct":
      return `Hi ${ctx.recipientFirstName}, settling the ${ctx.billTitle} tab${day}. Your portion is ${amount}. Tap here to close it out: ${ctx.link}`;
    case "banter":
      return `${ctx.recipientFirstName}! Squad duties call 🎉 You owe ${amount} for ${ctx.billTitle}${day} before it turns into a whole thing: ${ctx.link}`;
    case "casual":
    default:
      return `Hey ${ctx.recipientFirstName}! Quick one — your share for ${ctx.billTitle}${day} was ${amount}. Whenever you get a sec, send it over: ${ctx.link}`;
  }
}

/** wa.me deep link that opens WhatsApp with the message prefilled. */
export function buildWhatsAppLink(message: string, phone?: string): string {
  const base = phone
    ? `https://wa.me/${phone.replace(/[^\d]/g, "")}`
    : "https://api.whatsapp.com/send";
  const query = new URLSearchParams({ text: message });
  return `${base}?${query.toString()}`;
}
