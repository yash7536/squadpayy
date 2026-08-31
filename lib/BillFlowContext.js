"use client";

import { createContext, useContext, useState } from "react";
import { mockContacts } from "@/lib/mockBill";

// Carries the in-progress bill's split method (from Split Bill) and
// people list (from Add People) forward to Review & Send, so the amounts
// shown and the requests actually sent reflect what the sender really
// picked — not a fixed mock example.
//
// This is plain in-memory React state, not persisted anywhere: it's reset
// on a full page reload, and that's an accepted tradeoff for a wizard-
// style flow like this rather than adding a storage layer for it. Nothing
// is saved to Supabase until Review & Send's "Send requests" — the same
// boundary the app already had.
const BillFlowContext = createContext(null);

export function BillFlowProvider({ children }) {
  const [splitMethod, setSplitMethod] = useState("equal");
  const [contacts, setContacts] = useState(mockContacts);

  return (
    <BillFlowContext.Provider
      value={{ splitMethod, setSplitMethod, contacts, setContacts }}
    >
      {children}
    </BillFlowContext.Provider>
  );
}

export function useBillFlow() {
  const context = useContext(BillFlowContext);
  if (!context) {
    throw new Error("useBillFlow must be used within a BillFlowProvider");
  }
  return context;
}
