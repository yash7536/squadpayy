"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ScreenHeader from "@/components/ScreenHeader";
import Button from "@/components/Button";
import { mockBillLabel, mockBillMessageLabel } from "@/lib/mockBill";
import { splitEqually, splitBillWithTaxAndTip } from "@/lib/splitBill";
import { generatePaymentRequest } from "@/lib/paymentRequest";
import { buildWhatsAppLink } from "@/lib/phone";
import { useBillDraft, clearBillDraft } from "@/lib/billDraftStore";
import { createPaymentRequestsAction } from "@/lib/paymentRequestsActions";

// Matches the "Review & Send" screen of the Figma prototype (node 2:132).
//
// The people, split method, and bill itself (items/tax/tip/total) all
// come from the sessionStorage-backed bill draft — whatever the sender
// actually scanned/entered on Review Bill, chose on Split Bill, and
// added/removed on Add People is exactly what's computed and shown here,
// not a fixed mock example. This computation is always local (pure
// functions over the draft) and happens the same way whether or not
// anyone is signed in — it's TEMPORARY, in-browser-only data either way.
//
// Item assignment lives here (not on Split Bill) because this is the
// first point in the flow where the participant list actually exists —
// Split Bill only picks the METHOD, before Add People has run. Choosing
// "Split by item" there just explains that assignment happens next; the
// real, functional difference between the two modes — an assignment UI
// that recalculates each person's share live, vs. one flat equal-split
// list — is what happens right here.
//
// What differs by `isAuthenticated` (passed down from the Server
// Component in page.js) is only the final step:
// - Signed in: "Send requests" persists a real bill to Supabase, scoped
//   to that account by Row Level Security — this is the
//   ACCOUNT-SPECIFIC/PERSISTENT path (trackable status, history, a real
//   /pay/[token] link for each recipient).
// - Anonymous: nothing is ever sent to Supabase. Each person's WhatsApp
//   reminder is generated and opened directly from the local draft — a
//   one-off demo of the exact same split/messaging logic, gone the moment
//   the tab closes, with no account or history behind it.
export default function ReviewSend({ isAuthenticated }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const {
    splitMethod,
    contacts,
    billItems,
    billTax,
    billTip,
    billTotal,
    itemAssignments: assignments,
    setItemAssignments,
  } = useBillDraft();

  const participants = ["You", ...contacts.map((contact) => contact.name)];

  // Persisted in the shared bill draft (lib/billDraftStore.js), not local
  // component state — a missing/empty entry for an item means "no one
  // assigned yet" (see lib/splitBill.js's splitByItem doc comment for why
  // that's treated differently from no assignment key at all, which is
  // what makes "Split by item" start visibly different from "Split
  // equally" instead of silently matching it). Persisting this (rather
  // than a useState tied to this component's mount) means navigating away
  // — e.g. to Sign in and back — doesn't reset assignments the sender
  // already made.
  function toggleAssignment(itemName, person) {
    setItemAssignments((prev) => {
      const current = prev[itemName] ?? [];
      const next = current.includes(person)
        ? current.filter((p) => p !== person)
        : [...current, person];
      return { ...prev, [itemName]: next };
    });
  }

  // The persisted itemAssignments map only gets a key for an item once
  // it's actually been toggled at least once (see toggleAssignment) — a
  // never-touched item simply has no entry. lib/splitBill.js's splitByItem
  // treats a MISSING key as "no assignment info, fall back to everyone"
  // (case 1) and an EXPLICIT EMPTY array as "genuinely unassigned,
  // contributes nothing" (case 2) — two deliberately different things.
  // Normalizing here, once, before the split math ever sees it, makes
  // every current bill item explicit — matching what the UI below already
  // shows ("Not assigned yet" for anything with no owners) — rather than
  // silently falling back to an equal split for an item nobody's touched.
  const normalizedAssignments = Object.fromEntries(
    billItems.map((item) => [item.name, assignments[item.name] ?? []])
  );

  // "Split equally" divides the full confirmed total (already includes
  // tax/tip, if any) — always complete, instantly. "Split by item" reuses
  // Part K's splitBillWithTaxAndTip with the live, normalized assignments
  // above, so tax/tip are still divided proportionally to what each
  // person actually ordered — but per lib/splitBill.js's splitByItem, an
  // item nobody's been assigned to yet contributes nothing, so this only
  // sums to the full bill total once every item has at least one owner
  // (see isSplitReady below) — not necessarily on every keystroke while
  // the sender is still assigning things.
  const splitResult =
    splitMethod === "equal"
      ? splitEqually(billTotal, participants)
      : splitBillWithTaxAndTip({
          items: billItems,
          tax: billTax,
          tip: billTip,
          people: participants,
          assignments: normalizedAssignments,
        });

  const unassignedItems =
    splitMethod === "item"
      ? billItems.filter((item) => normalizedAssignments[item.name].length === 0)
      : [];
  // "Split equally" has nothing to assign, so it's always ready to send.
  const isSplitReady = splitMethod === "equal" || unassignedItems.length === 0;
  const assignedAmount = splitResult.reduce((sum, entry) => sum + entry.amount, 0);
  const unassignedAmount = billTotal - assignedAmount;

  const phoneByName = new Map(contacts.map((contact) => [contact.name, contact.phone]));

  // Saves a real bill + people + splits + payment_requests to Supabase
  // (see lib/paymentRequestsActions.js), then moves on to the reminder
  // screen for whoever's owed first. Only reachable when isAuthenticated —
  // the button that calls this doesn't render otherwise.
  function handleSend() {
    setError(null);
    startTransition(async () => {
      try {
        const { requests } = await createPaymentRequestsAction({
          splitResult,
          contacts,
          totalAmount: billTotal,
          billTitle: mockBillLabel,
          billMessageLabel: mockBillMessageLabel,
        });

        // The bill is safely in Supabase now — clear the local draft so
        // it doesn't linger and get reused for the next unrelated bill.
        clearBillDraft();

        const firstPending = requests.find((request) => request.status === "pending");
        router.push(
          firstPending ? `/payment-reminder/${firstPending.token}` : "/payment-status"
        );
      } catch (err) {
        if (err instanceof Error && err.message === "UNAUTHENTICATED") {
          router.push("/login?next=/review-send");
          return;
        }
        setError("Something went wrong saving your bill. Please try again.");
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4 pb-14">
      <ScreenHeader title="Review & send" backHref="/add-people" />

      <p className="mt-[14px] text-sm text-black">Your split</p>
      <p className="mt-[7px] text-sm text-black">Total</p>
      <p className="mt-[5px] text-2xl font-semibold text-black">
        Rs.{billTotal.toLocaleString("en-IN")}
      </p>

      {/* This is the actual visible difference between the two modes:
          "Split by item" starts with nothing assigned and shows a real
          assignment UI that recalculates the amounts below as it changes;
          "Split equally" doesn't, because there's nothing to assign. */}
      {splitMethod === "item" && (
        <div className="mt-[22px] flex flex-col gap-3">
          <p className="text-sm text-black">
            Tap who ordered each item below — an item can go to one person
            or be shared by several.
          </p>
          {billItems.map((item) => {
            const owners = normalizedAssignments[item.name];
            const isUnassigned = owners.length === 0;
            return (
              <div
                key={item.name}
                className={`rounded-[10px] border p-3 ${
                  isUnassigned ? "border-red-300" : "border-[#D9D9D9]"
                }`}
              >
                <div className="flex items-center justify-between text-sm text-black">
                  <span>{item.name}</span>
                  <span>Rs.{item.amount.toLocaleString("en-IN")}</span>
                </div>
                {isUnassigned && (
                  <p className="mt-1 text-xs text-red-600">Not assigned yet</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {participants.map((person) => {
                    const checked = owners.includes(person);
                    return (
                      <button
                        key={person}
                        type="button"
                        onClick={() => toggleAssignment(item.name, person)}
                        aria-pressed={checked}
                        className={`rounded-full px-3 py-1 text-xs ${
                          checked
                            ? "bg-[#737373] text-white"
                            : "bg-[#EDEDED] text-[#737373]"
                        }`}
                      >
                        {person}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!isSplitReady && (
            <p className="text-sm text-red-600">
              Rs.{unassignedAmount.toLocaleString("en-IN")} isn&rsquo;t
              assigned to anyone yet — assign every item to continue.
            </p>
          )}
        </div>
      )}

      <div className="mt-[27px] flex flex-col">
        {splitResult.map((entry, index) => {
          // Only relevant for the anonymous demo path (see below) — computed
          // for everyone unconditionally since it's cheap and keeps this
          // map straightforward to read.
          const isSelf = entry.person === "You";
          const { message } = isSelf
            ? { message: null }
            : generatePaymentRequest(entry.person, entry.amount, mockBillMessageLabel);
          const whatsappUrl = isSelf
            ? null
            : buildWhatsAppLink(phoneByName.get(entry.person), message);

          return (
            <div
              key={entry.person}
              className={`flex h-14 w-full items-center justify-between gap-2 rounded-[10px] bg-[#D9D9D9] px-4 text-base text-black ${
                index === 0 ? "" : "mt-[13px]"
              }`}
            >
              <span>
                {entry.person} - Rs.{entry.amount}
              </span>

              {/* Anonymous demo only — a signed-in sender gets one bulk
                  "Send requests" action below instead (real, persisted,
                  per-recipient reminder screens with tracked status).
                  Hidden while items are still unassigned — these amounts
                  aren't final yet, so there's nothing worth sending. */}
              {!isAuthenticated && !isSelf && isSplitReady && (
                whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-sm font-semibold text-[#737373] underline"
                  >
                    WhatsApp
                  </a>
                ) : (
                  <span className="shrink-0 text-xs text-red-600">No phone</span>
                )
              )}
            </div>
          );
        })}
      </div>

      {!isSplitReady ? (
        <p className="mt-[38px] text-sm text-[#C0C0C0]">
          Assign every item above to see the final split and continue.
        </p>
      ) : isAuthenticated ? (
        <>
          <p className="mt-[38px] text-sm text-[#C0C0C0]">
            Payment reminders are sent via WhatsApp.
          </p>

          <Button
            variant="dark"
            onClick={handleSend}
            disabled={isPending}
            className="mt-[22px] h-14 w-full"
          >
            {isPending ? "Sending…" : "Send requests"}
          </Button>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </>
      ) : (
        <>
          <p className="mt-[38px] text-sm text-[#C0C0C0]">
            This is a demo split — tap WhatsApp above to try sending a
            reminder. Nothing is saved, and no one is contacted unless you
            actually send the message yourself.
          </p>

          <Button
            href="/login?next=/review-send"
            variant="dark"
            className="mt-[22px] h-14 w-full"
          >
            Sign in to save this bill
          </Button>
        </>
      )}
    </div>
  );
}
