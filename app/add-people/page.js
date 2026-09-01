"use client";

import { useState } from "react";
import ScreenHeader from "@/components/ScreenHeader";
import Button from "@/components/Button";
import { useBillDraft } from "@/lib/billDraftStore";
import { isPlausiblePhoneNumber } from "@/lib/phone";

function makeContactId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// A contact's name has to stay unique within this bill — not just so the
// list doesn't look confusing, but because the split math
// (lib/splitBill.js) sums amounts into a Map keyed by name; two contacts
// sharing a name would silently collapse into one entry and understate
// what they're each shown to owe. "You" is reserved for the same reason
// — the sender is always added separately when the split is computed, so
// a contact literally named "You" would collide with that.
function validateContactName(name, contacts, excludeId) {
  const trimmed = name.trim();
  if (!trimmed) return "Enter a name.";
  if (trimmed.toLowerCase() === "you") {
    return "You're already included — no need to add yourself.";
  }
  const isDuplicate = contacts.some(
    (contact) =>
      contact.id !== excludeId &&
      contact.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (isDuplicate) return "Someone with that name is already in the list.";
  return null;
}

// Phone is required (not optional, unlike the old email field) — the
// final step of the flow is a WhatsApp reminder (lib/phone.js), which
// needs a real number to build a wa.me link from.
function validateContactPhone(phone) {
  const trimmed = phone.trim();
  if (!trimmed) return "Enter a phone number.";
  if (!isPlausiblePhoneNumber(trimmed)) {
    return "That doesn't look like a valid phone number.";
  }
  return null;
}

// Matches the "Add People" screen of the Figma prototype (node 2:108).
//
// The design shows 3 example contact cards but no add/remove/edit
// controls — it's a static mockup. Making this screen actually work needs
// a few small additions not in the design: a "×" and "✎" on each card,
// and a tiny inline form (reused for both add and edit) — everything else
// (layout, wording, spacing, colors) matches the Figma file exactly.
//
// `contacts` lives in the sessionStorage-backed bill draft (see
// lib/billDraftStore.js) — whatever the sender adds, edits, or removes
// here is exactly what Review & Send computes amounts for and persists to
// Supabase. Not a fixed mock list, and no separate copy of it exists
// anywhere else in the app.
export default function AddPeople() {
  const { contacts, setContacts } = useBillDraft();

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [addError, setAddError] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editError, setEditError] = useState(null);

  function startAdding() {
    setEditingId(null);
    setIsAdding(true);
    setAddError(null);
  }

  function handleAddContact(event) {
    event.preventDefault();
    const nameError = validateContactName(newName, contacts, null);
    const phoneError = validateContactPhone(newPhone);
    if (nameError || phoneError) {
      setAddError(nameError || phoneError);
      return;
    }

    setContacts((prev) => [
      ...prev,
      { id: makeContactId(), name: newName.trim(), phone: newPhone.trim() },
    ]);
    setNewName("");
    setNewPhone("");
    setAddError(null);
    setIsAdding(false);
  }

  function handleCancelAdd() {
    setIsAdding(false);
    setNewName("");
    setNewPhone("");
    setAddError(null);
  }

  function handleRemoveContact(id) {
    setContacts((prev) => prev.filter((contact) => contact.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function startEditing(contact) {
    setIsAdding(false);
    setEditingId(contact.id);
    setEditName(contact.name);
    setEditPhone(contact.phone ?? "");
    setEditError(null);
  }

  function handleSaveEdit(event) {
    event.preventDefault();
    const nameError = validateContactName(editName, contacts, editingId);
    const phoneError = validateContactPhone(editPhone);
    if (nameError || phoneError) {
      setEditError(nameError || phoneError);
      return;
    }

    const editedId = editingId;
    setContacts((prev) =>
      prev.map((contact) =>
        contact.id === editedId
          ? { ...contact, name: editName.trim(), phone: editPhone.trim() }
          : contact
      )
    );
    setEditingId(null);
    setEditError(null);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditError(null);
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
            onChange={(event) => {
              setNewName(event.target.value);
              setAddError(null);
            }}
            placeholder="Name"
            autoFocus
            className="h-11 w-full rounded-[8px] border border-[#D9D9D9] px-3 text-base text-black outline-none focus:border-[#737373]"
          />
          <input
            type="tel"
            value={newPhone}
            onChange={(event) => {
              setNewPhone(event.target.value);
              setAddError(null);
            }}
            placeholder="Phone number (e.g. +91 98765 43210)"
            className="h-11 w-full rounded-[8px] border border-[#D9D9D9] px-3 text-base text-black outline-none focus:border-[#737373]"
          />
          {addError && <p className="text-sm text-red-600">{addError}</p>}
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
          onClick={startAdding}
        >
          + Add a person
        </Button>
      )}

      <div className="mt-[32px] flex flex-col gap-[14px]">
        {contacts.map((contact) =>
          editingId === contact.id ? (
            <form
              key={contact.id}
              onSubmit={handleSaveEdit}
              className="flex flex-col gap-2 rounded-[10px] border border-[#737373] p-3"
            >
              <input
                type="text"
                value={editName}
                onChange={(event) => {
                  setEditName(event.target.value);
                  setEditError(null);
                }}
                placeholder="Name"
                autoFocus
                className="h-11 w-full rounded-[8px] border border-[#D9D9D9] px-3 text-base text-black outline-none focus:border-[#737373]"
              />
              <input
                type="tel"
                value={editPhone}
                onChange={(event) => {
                  setEditPhone(event.target.value);
                  setEditError(null);
                }}
                placeholder="Phone number (e.g. +91 98765 43210)"
                className="h-11 w-full rounded-[8px] border border-[#D9D9D9] px-3 text-base text-black outline-none focus:border-[#737373]"
              />
              {editError && <p className="text-sm text-red-600">{editError}</p>}
              <div className="flex gap-2">
                <Button type="submit" variant="dark" className="h-11 flex-1">
                  Save
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 flex-1"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div
              key={contact.id}
              className="relative flex h-14 w-full flex-col items-center justify-center rounded-[10px] bg-[#D9D9D9] text-black"
            >
              <span className="text-base leading-tight">{contact.name}</span>
              {contact.phone && (
                <span className="text-base leading-tight">{contact.phone}</span>
              )}

              {/* Two separate buttons, not nested — a button inside a
                  button is invalid HTML and unreliable for touch/screen
                  readers. Each gets a real ~40px tap target even though
                  the glyph itself is small, for mobile use. */}
              <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
                <button
                  type="button"
                  onClick={() => startEditing(contact)}
                  aria-label={`Edit ${contact.name}`}
                  className="flex h-10 w-10 items-center justify-center text-base text-[#737373]"
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveContact(contact.id)}
                  aria-label={`Remove ${contact.name}`}
                  className="flex h-10 w-10 items-center justify-center text-xl leading-none text-[#737373]"
                >
                  &times;
                </button>
              </div>
            </div>
          )
        )}

        {contacts.length === 0 && (
          <p className="text-center text-sm text-[#BCBCBC]">
            No one added yet — it&rsquo;ll just be split with you.
          </p>
        )}
      </div>

      <p className="mt-[29px] text-sm text-[#BCBCBC]">
        They don&rsquo;t need SquadPay app. We&rsquo;ll send them a payment
        reminder on WhatsApp.
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
