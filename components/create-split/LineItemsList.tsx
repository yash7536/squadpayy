"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Icon } from "@/components/ui/Icon";
import { useSplitDraft } from "@/lib/data/draft-context";

export function LineItemsList() {
  const { draft, addItem, removeItem, updateItem } = useSplitDraft();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  function submitNewItem() {
    const parsedAmount = Number(amount.replace(/[^0-9.]/g, ""));
    if (!name.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    addItem({ name: name.trim(), quantity: 1, amount: parsedAmount });
    setName("");
    setAmount("");
    setShowAdd(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between pb-1">
        <span className="text-label-sm text-on-surface font-semibold">
          Extracted items ({draft.items.length})
        </span>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1 text-primary-container hover:text-primary text-label-sm font-semibold transition-colors"
        >
          <Icon name="add" size={18} />
          Add item manually
        </button>
      </div>

      {showAdd && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-low">
          <input
            autoFocus
            type="text"
            placeholder="Item name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 bg-transparent text-label-md text-on-surface focus:outline-none border-b border-surface-variant px-1 py-1"
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="₹0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitNewItem()}
            className="w-20 text-right bg-transparent text-numeral-md text-on-surface focus:outline-none border-b border-surface-variant"
          />
          <button
            type="button"
            onClick={submitNewItem}
            className="text-primary-container hover:text-primary p-1"
            aria-label="Add item"
          >
            <Icon name="check" size={20} />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1 max-h-72 overflow-y-auto pr-1">
        {draft.items.length === 0 && !showAdd && (
          <p className="text-body-sm text-on-surface-variant py-4 text-center">
            No items yet — scan a receipt above or add one manually.
          </p>
        )}
        <AnimatePresence initial={false}>
          {draft.items.map((item, index) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors overflow-hidden"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 h-6 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center text-caption-caps shrink-0">
                  {index + 1}
                </span>
                <div className="flex flex-col min-w-0">
                  <input
                    value={item.name}
                    onChange={(e) => updateItem(item.id, { name: e.target.value })}
                    className="bg-transparent text-label-md text-on-surface font-medium focus:outline-none truncate"
                  />
                  <span className="flex items-center gap-1 text-body-sm text-on-surface-variant">
                    Qty:
                    <input
                      type="text"
                      inputMode="numeric"
                      value={item.quantity}
                      onChange={(e) => {
                        const n = Math.round(Number(e.target.value.replace(/[^0-9]/g, "")));
                        updateItem(item.id, { quantity: Number.isFinite(n) && n > 0 ? n : 1 });
                      }}
                      className="w-8 bg-transparent text-on-surface-variant focus:outline-none border-b border-surface-variant"
                    />
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="flex items-center text-numeral-md text-on-surface">
                  ₹
                  <input
                    type="text"
                    inputMode="decimal"
                    value={item.amount}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
                      updateItem(item.id, { amount: Number.isFinite(n) ? n : 0 });
                    }}
                    className="w-16 text-right bg-transparent text-numeral-md text-on-surface focus:outline-none border-b border-surface-variant"
                  />
                </span>
                <button
                  type="button"
                  aria-label="Remove item"
                  onClick={() => removeItem(item.id)}
                  className="text-outline hover:text-error transition-colors p-1"
                >
                  <Icon name="close" size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
