import type {
  ActivityEvent,
  Bill,
  ItemAssignment,
  Participant,
  Split,
} from "@/lib/domain/types";

/**
 * Seed data for demo mode (no Supabase configured).
 *
 * Only raw inputs are hardcoded here — item prices, quantities, who claimed
 * what. Every downstream number (subtotals, tax splits, totals owed) is
 * computed live by `lib/domain/split-engine.ts`, never typed in directly.
 */

export const YOU_ID = "you";

export const DEMO_PARTICIPANTS: Participant[] = [
  { id: YOU_ID, name: "You", isSelf: true },
  { id: "meera", name: "Meera Iyer" },
  { id: "rohan", name: "Rohan Kapoor" },
  { id: "devika", name: "Devika Nair" },
  { id: "arjun", name: "Arjun Malhotra" },
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function hoursAgo(n: number): string {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d.toISOString();
}

/* ---------------------------------------------------------------------- */
/* Split 1 — Marination Grill Night. Item-by-item, in progress.            */
/* ---------------------------------------------------------------------- */

const grillBill: Bill = {
  id: "bill-grill",
  title: "Marination Grill Night",
  merchant: "Marination Grill & Tap",
  merchantLocation: "Bandra West, Mumbai · Wood-fired grill",
  date: daysAgo(3),
  subtotal: 3120,
  taxAndService: 468,
  total: 3588,
  splitMode: "item",
  items: [
    { id: "g1", name: "Peri-Peri Chicken Skewers", quantity: 2, amount: 780, category: "Mains", icon: "kebab_dining" },
    { id: "g2", name: "Wood-Fired Garlic Naan", quantity: 4, amount: 480, category: "Bread", icon: "bakery_dining" },
    { id: "g3", name: "Smoked Paneer Tikka", quantity: 1, amount: 460, category: "Veg Solo", icon: "nutrition" },
    { id: "g4", name: "Craft IPA Pints", quantity: 3, amount: 990, category: "Drinks", icon: "sports_bar" },
    { id: "g5", name: "Salted Caramel Brownie", quantity: 2, amount: 410, category: "Dessert", icon: "cake" },
  ],
  createdAt: daysAgo(3),
};

const grillAssignments: ItemAssignment[] = [
  { itemId: "g1", shared: false, shares: { [YOU_ID]: 1, meera: 1 } },
  { itemId: "g2", shared: true, shares: { [YOU_ID]: 1, meera: 1, rohan: 1, devika: 1 } },
  { itemId: "g3", shared: false, shares: { devika: 1 } },
  { itemId: "g4", shared: false, shares: { [YOU_ID]: 1, rohan: 2 } },
  { itemId: "g5", shared: true, shares: { meera: 1, devika: 1 } },
];

/* ---------------------------------------------------------------------- */
/* Split 2 — Late Night Biryani Run. Item-by-item, mostly pending.         */
/* ---------------------------------------------------------------------- */

const biryaniBill: Bill = {
  id: "bill-biryani",
  title: "Late Night Biryani Run",
  merchant: "Shah Ghouse Biryani",
  merchantLocation: "Powai, Mumbai · Late-night delivery",
  date: daysAgo(1),
  subtotal: 1720,
  taxAndService: 172,
  total: 1892,
  splitMode: "item",
  items: [
    { id: "b1", name: "Mutton Biryani (Family Pack)", quantity: 1, amount: 890, category: "Mains", icon: "restaurant" },
    { id: "b2", name: "Chicken 65", quantity: 1, amount: 340, category: "Starter", icon: "skillet" },
    { id: "b3", name: "Double Ka Meetha", quantity: 2, amount: 260, category: "Dessert", icon: "cake" },
    { id: "b4", name: "Buttermilk", quantity: 3, amount: 230, category: "Drinks", icon: "local_bar" },
  ],
  createdAt: daysAgo(1),
};

const biryaniAssignments: ItemAssignment[] = [
  { itemId: "b1", shared: true, shares: { [YOU_ID]: 1, arjun: 1, rohan: 1 } },
  { itemId: "b2", shared: false, shares: { arjun: 1 } },
  { itemId: "b3", shared: true, shares: { [YOU_ID]: 1, rohan: 1 } },
  { itemId: "b4", shared: true, shares: { [YOU_ID]: 1, arjun: 1, rohan: 1 } },
];

/* ---------------------------------------------------------------------- */
/* Split 3 — Sunday Filter Coffee Brunch. Equal split, fully settled.      */
/* ---------------------------------------------------------------------- */

const brunchBill: Bill = {
  id: "bill-brunch",
  title: "Sunday Filter Coffee Brunch",
  merchant: "Kaffeine Roasters",
  merchantLocation: "Koramangala, Bengaluru",
  date: daysAgo(6),
  subtotal: 1780,
  taxAndService: 0,
  total: 1780,
  splitMode: "equal",
  items: [],
  createdAt: daysAgo(6),
};

/* ---------------------------------------------------------------------- */
/* Split 4 — Alibaug Weekend Villa. Equal split, fully settled, big total. */
/* ---------------------------------------------------------------------- */

const villaBill: Bill = {
  id: "bill-villa",
  title: "Alibaug Weekend Villa",
  merchant: "Seaside Villa Co-op",
  merchantLocation: "Alibaug, Maharashtra",
  date: daysAgo(9),
  subtotal: 18400,
  taxAndService: 0,
  total: 18400,
  splitMode: "equal",
  items: [],
  createdAt: daysAgo(9),
};

export const DEMO_SPLITS: Split[] = [
  {
    id: "split-grill",
    bill: grillBill,
    participants: [YOU_ID, "meera", "rohan", "devika"].map(
      (id) => DEMO_PARTICIPANTS.find((p) => p.id === id)!,
    ),
    assignments: grillAssignments,
    payerId: YOU_ID,
    paymentStatus: {
      [YOU_ID]: "paid",
      meera: "pending",
      rohan: "reminder_sent",
      devika: "paid",
    },
    createdAt: daysAgo(3),
  },
  {
    id: "split-biryani",
    bill: biryaniBill,
    participants: [YOU_ID, "arjun", "rohan"].map(
      (id) => DEMO_PARTICIPANTS.find((p) => p.id === id)!,
    ),
    assignments: biryaniAssignments,
    payerId: YOU_ID,
    paymentStatus: {
      [YOU_ID]: "paid",
      arjun: "pending",
      rohan: "pending",
    },
    createdAt: daysAgo(1),
  },
  {
    id: "split-brunch",
    bill: brunchBill,
    participants: [YOU_ID, "devika"].map(
      (id) => DEMO_PARTICIPANTS.find((p) => p.id === id)!,
    ),
    assignments: [],
    payerId: YOU_ID,
    paymentStatus: {
      [YOU_ID]: "paid",
      devika: "paid",
    },
    createdAt: daysAgo(6),
  },
  {
    id: "split-villa",
    bill: villaBill,
    participants: DEMO_PARTICIPANTS,
    assignments: [],
    payerId: YOU_ID,
    paymentStatus: {
      [YOU_ID]: "paid",
      meera: "paid",
      rohan: "paid",
      devika: "paid",
      arjun: "paid",
    },
    createdAt: daysAgo(9),
  },
];

export const DEMO_ACTIVITY: ActivityEvent[] = [
  {
    id: "act-1",
    splitId: "split-grill",
    type: "viewed",
    actorName: "Rohan Kapoor",
    detail: "viewed the gentle reminder",
    timestamp: hoursAgo(0.3),
  },
  {
    id: "act-2",
    splitId: "split-brunch",
    type: "paid",
    actorName: "Devika Nair",
    detail: "paid via UPI",
    amount: 890,
    timestamp: hoursAgo(2),
  },
  {
    id: "act-3",
    splitId: "split-biryani",
    type: "created",
    actorName: "You",
    detail: "created split for Late Night Biryani Run",
    amount: biryaniBill.total,
    timestamp: daysAgo(1),
  },
  {
    id: "act-4",
    splitId: "split-villa",
    type: "settled",
    actorName: "Arjun Malhotra",
    detail: "settled their share",
    amount: Math.round(villaBill.total / 5),
    timestamp: daysAgo(2),
  },
];
