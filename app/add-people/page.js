"use client";

import { useState } from "react";
import ScreenHeader from "@/components/ScreenHeader";
import Button from "@/components/Button";
import { useBillFlow } from "@/lib/BillFlowContext";

// Matches the "Add People" screen of the Figma prototype (node 2:108).
//
// The design shows 3 example contact cards but no add/remove controls —
// it's a static mockup. Making this screen actually add and remove people
// needs a couple of small additions not in the design: a "×" on each card,
// and a tiny inline form under "+ Add a person". Everything else (layout,
// wording, spacing, colors) matches the Figma file exactly.
//
// `contacts` lives in BillFlowContext (not local state) so whatever the
// sender adds or removes here is exactly what Review & Send computes
// amounts for and creates payment requests for — not a fixed mock list.
export default function AddPeople() {
  const { contacts, setContacts } = useBillFlow();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  function handleAddContact(event) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;

    setContacts((prev) => [...prev, { name, email: newEmail.trim() }]);
    setNewName("");
    setNewEmail("");
    setIsAdding(false);
  }

  function handleCancelAdd() {
    setIsAdding(false);
    setNewName("");
    setNewEmail("");
  }

  function handleRemoveContact(name) {
    setContacts((prev) => prev.filter((contact) => contact.name !== name));
  }

  return (
    <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4 pb-14">
      <ScreenHeader title="Add people" backHref="/split-bill" />

      <p className="mt-[14px] text-sm text-black">
        Who should we include in the split?
      </p>

      {isAdding ? (
        <form
          onSubmit={handleAddContact}
          className="mt-[27px] flex flex-col gap-2 rounded-[10px] border border-[#D9D9D9] p-3"
        >
          <input
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Name"
            autoFocus
            className="h-11 w-full rounded-[8px] border border-[#D9D9D9] px-3 text-base text-black outline-none focus:border-[#737373]"
          />
          <input
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            placeholder="Email (optional)"
            className="h-11 w-full rounded-[8px] border border-[#D9D9D9] px-3 text-base text-black outline-none focus:border-[#737373]"
          />
          <div className="flex gap-2">
            <Button type="submit" variant="dark" className="h-11 flex-1">
              Add
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-11 flex-1"
              onClick={handleCancelAdd}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          variant="secondary"
          className="mt-[27px] h-14 w-full"
          onClick={() => setIsAdding(true)}
        >
          + Add a person
        </Button>
      )}

      <div className="mt-[32px] flex flex-col">
        {contacts.map((contact, index) => (
          <div
            key={contact.name}
            className={`relative flex h-14 w-full flex-col items-center justify-center rounded-[10px] bg-[#D9D9D9] text-black ${
              index === 0 ? "" : "mt-[14px]"
            }`}
          >
            <span className="text-base leading-tight">{contact.name}</span>
            {contact.email && (
              <span className="text-base leading-tight">{contact.email}</span>
            )}
            <button
              type="button"
              onClick={() => handleRemoveContact(contact.name)}
              aria-label={`Remove ${contact.name}`}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xl leading-none text-[#737373]"
            >
              &times;
            </button>
          </div>
        ))}

        {contacts.length === 0 && (
          <p className="text-center text-sm text-[#BCBCBC]">
            No one added yet — it&rsquo;ll just be split with you.
          </p>
        )}
      </div>

      <p className="mt-[29px] text-sm text-[#BCBCBC]">
        They don&rsquo;t need SquadPay app. We&rsquo;ll send them a payment
        request by text.
      </p>

      <Button
        href="/review-send"
        variant="dark"
        className="mt-[30px] h-14 w-full"
      >
        Continue
      </Button>
    </div>
  );
}
