// The starting contact list shown on Add People — exactly the 3 example
// contacts from that Figma screen (node 2:108). "You" is deliberately not
// in this list (you don't add yourself); it's added at calculation time.
//
// Each has a fixed `id` (not just name/phone) so Add People's edit/remove
// actions can reference a specific contact reliably — matching by name
// alone breaks the moment someone edits a name, or if a rename would
// momentarily collide with another entry.
//
// Phone (not email) is the contact field — SquadPay's final step is a
// WhatsApp payment reminder (see lib/phone.js), which needs a phone
// number, not an email address.
export const mockContacts = [
  { id: "seed-rahul", name: "Rahul", phone: "+91 98765 43210" },
  { id: "seed-ananya", name: "Ananya", phone: "+91 91234 56789" },
  { id: "seed-rohan", name: "Rohan", phone: "+91 90000 11111" },
];

// The bill's display name, shown as a label on Payment Status and Payment
// Complete — matches the Figma text on both screens exactly ("Dinner
// split").
export const mockBillLabel = "Dinner split";

// The phrase used inside generated reminder messages (Payment Reminder /
// Review & Send) — matches the Figma wording there ("...from our
// dinner..."), which is worded slightly differently from mockBillLabel
// above. Both come from this one file so there's a single source to
// update later.
export const mockBillMessageLabel = "our dinner";
