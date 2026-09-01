// Automated tests for lib/splitBill.js. Run with `npm test` (Node's
// built-in test runner — node:test — deliberately used instead of adding
// Jest/Vitest as a dependency; these are plain functions with no DOM/React
// involved, so nothing beyond Node itself is needed to test them).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  splitEqually,
  splitByItem,
  splitProportionally,
  splitBillWithTaxAndTip,
} from "./splitBill.js";

function sumAmounts(shares) {
  return shares.reduce((sum, share) => sum + share.amount, 0);
}

describe("splitEqually", () => {
  test("splits evenly with no remainder", () => {
    const result = splitEqually(300, ["A", "B", "C"]);
    assert.deepEqual(result, [
      { person: "A", amount: 100 },
      { person: "B", amount: 100 },
      { person: "C", amount: 100 },
    ]);
  });

  test("distributes the remainder fairly, starting from index 0 by default", () => {
    const result = splitEqually(100, ["A", "B", "C"]);
    assert.deepEqual(result, [
      { person: "A", amount: 34 },
      { person: "B", amount: 33 },
      { person: "C", amount: 33 },
    ]);
    assert.equal(sumAmounts(result), 100);
  });

  test("rotates the remainder start correctly", () => {
    const result = splitEqually(100, ["A", "B", "C"], 1);
    assert.deepEqual(result, [
      { person: "A", amount: 33 },
      { person: "B", amount: 34 },
      { person: "C", amount: 33 },
    ]);
    assert.equal(sumAmounts(result), 100);
  });

  test("one person gets the entire amount", () => {
    assert.deepEqual(splitEqually(2400, ["Solo"]), [
      { person: "Solo", amount: 2400 },
    ]);
  });

  test("zero people returns an empty array, not an error", () => {
    assert.deepEqual(splitEqually(500, []), []);
  });

  test("zero total gives everyone zero", () => {
    assert.deepEqual(splitEqually(0, ["A", "B"]), [
      { person: "A", amount: 0 },
      { person: "B", amount: 0 },
    ]);
  });

  test("every share is the base amount or one rupee more — sum always exact", () => {
    // Deterministic sweep, not randomized — a failure here should always
    // reproduce the same way.
    for (let total = 0; total <= 250; total += 7) {
      for (let count = 1; count <= 9; count++) {
        const people = Array.from({ length: count }, (_, i) => `P${i}`);
        const result = splitEqually(total, people);
        assert.equal(
          sumAmounts(result),
          total,
          `total=${total} count=${count} did not sum correctly`
        );
        const base = Math.floor(total / count);
        for (const { amount } of result) {
          assert.ok(
            amount === base || amount === base + 1,
            `total=${total} count=${count} produced an out-of-range share: ${amount}`
          );
        }
      }
    }
  });
});

describe("splitByItem", () => {
  const items = [
    { name: "Dinner", amount: 1800 },
    { name: "Drinks", amount: 400 },
    { name: "Service Charge", amount: 200 },
  ];
  const people = ["You", "Rahul", "Ananya"];

  test("matches the app's known example exactly with no assignments", () => {
    assert.deepEqual(splitByItem(items, people, {}), [
      { person: "You", amount: 800 },
      { person: "Rahul", amount: 800 },
      { person: "Ananya", amount: 800 },
    ]);
  });

  test("sums to the bill total regardless of assignment", () => {
    const result = splitByItem(items, people, { Drinks: ["You"] });
    assert.equal(sumAmounts(result), 2400);
  });

  test("an item assigned to one person is paid entirely by them", () => {
    const result = splitByItem(items, people, { Drinks: ["Rahul"] });
    const rahul = result.find((r) => r.person === "Rahul").amount;
    const you = result.find((r) => r.person === "You").amount;
    assert.ok(rahul > you, "the person who ordered Drinks should owe more");
  });

  test("remainder rotation prevents one person absorbing every item's rounding", () => {
    // Every item here has a remainder when split 3 ways. Without
    // rotation, "You" (first in the list) would end up with all three
    // leftover rupees instead of one each.
    const unevenItems = [
      { name: "A", amount: 100 },
      { name: "B", amount: 100 },
      { name: "C", amount: 100 },
    ];
    assert.deepEqual(splitByItem(unevenItems, people, {}), [
      { person: "You", amount: 100 },
      { person: "Rahul", amount: 100 },
      { person: "Ananya", amount: 100 },
    ]);
  });

  test("a stale assignment referencing a removed person doesn't lose their share", () => {
    // "Priya" isn't in `people` (e.g. she was removed from the bill after
    // being assigned Drinks) — her share must fall back to everyone still
    // in the bill, not vanish from the total.
    const result = splitByItem(items, people, { Drinks: ["Priya"] });
    assert.equal(sumAmounts(result), 2400);
    assert.equal(result.length, 3);
  });

  test("a stale assignment mixed with a valid one keeps only the valid owner", () => {
    const result = splitByItem(items, people, { Drinks: ["Priya", "Rahul"] });
    assert.equal(sumAmounts(result), 2400);
    // Rahul is the only real owner left, so he should carry all of Drinks.
    const rahul = result.find((r) => r.person === "Rahul").amount;
    const you = result.find((r) => r.person === "You").amount;
    assert.ok(rahul > you);
  });

  test("one person, one item", () => {
    assert.deepEqual(
      splitByItem([{ name: "Coffee", amount: 150 }], ["Solo"]),
      [{ person: "Solo", amount: 150 }]
    );
  });

  test("empty items list gives everyone zero, still no crash", () => {
    assert.deepEqual(splitByItem([], ["A", "B"]), [
      { person: "A", amount: 0 },
      { person: "B", amount: 0 },
    ]);
  });

  test("zero people with non-empty items returns an empty array, not an error", () => {
    assert.deepEqual(splitByItem(items, []), []);
  });

  test("adding a person changes the split with no leftover state from a prior call", () => {
    const withThree = splitByItem(items, ["You", "Rahul", "Ananya"], {});
    const withFour = splitByItem(
      items,
      ["You", "Rahul", "Ananya", "Priya"],
      {}
    );
    assert.equal(sumAmounts(withThree), 2400);
    assert.equal(sumAmounts(withFour), 2400);
    assert.notDeepEqual(withThree, withFour);
  });

  test("removing a person redistributes their share, still sums correctly", () => {
    const result = splitByItem(items, ["You", "Rahul"], {});
    assert.equal(sumAmounts(result), 2400);
    assert.equal(result.length, 2);
  });
});

describe("splitProportionally (tax/tip)", () => {
  test("splits proportionally to each person's subtotal", () => {
    const subtotals = new Map([
      ["A", 600],
      ["B", 200],
      ["C", 200],
    ]);
    // A ordered 3x what B or C did, so on a tax of 100, A should owe 3x
    // as much tax as either of them.
    const result = splitProportionally(100, ["A", "B", "C"], subtotals);
    assert.equal(sumAmounts(result), 100);
    const a = result.find((r) => r.person === "A").amount;
    const b = result.find((r) => r.person === "B").amount;
    assert.equal(a, 60);
    assert.equal(b, 20);
  });

  test("falls back to an equal split when nobody has a subtotal", () => {
    const subtotals = new Map([
      ["A", 0],
      ["B", 0],
    ]);
    assert.deepEqual(splitProportionally(50, ["A", "B"], subtotals), [
      { person: "A", amount: 25 },
      { person: "B", amount: 25 },
    ]);
  });

  test("largest-remainder rounding still sums exactly for an awkward split", () => {
    const subtotals = new Map([
      ["A", 1],
      ["B", 1],
      ["C", 1],
    ]);
    // 10 split 3 ways proportionally (equal subtotals here) = 3.33 each;
    // largest-remainder should give two people 3 and one person 4.
    const result = splitProportionally(10, ["A", "B", "C"], subtotals);
    assert.equal(sumAmounts(result), 10);
    const amounts = result.map((r) => r.amount).sort();
    assert.deepEqual(amounts, [3, 3, 4]);
  });

  test("one person gets everything", () => {
    const subtotals = new Map([["Solo", 500]]);
    assert.deepEqual(splitProportionally(37, ["Solo"], subtotals), [
      { person: "Solo", amount: 37 },
    ]);
  });

  test("zero people returns an empty array", () => {
    assert.deepEqual(splitProportionally(100, [], new Map()), []);
  });
});

describe("splitBillWithTaxAndTip", () => {
  const items = [
    { name: "Dinner", amount: 1800 },
    { name: "Drinks", amount: 400 },
    { name: "Service Charge", amount: 200 },
  ];
  const people = ["You", "Rahul", "Ananya"];

  test("with zero tax/tip, matches plain splitByItem", () => {
    const withTaxTip = splitBillWithTaxAndTip({ items, people });
    const plain = splitByItem(items, people, {});
    assert.deepEqual(withTaxTip, plain);
  });

  test("sums to exactly subtotal + tax + tip", () => {
    const result = splitBillWithTaxAndTip({
      items,
      tax: 120,
      tip: 300,
      people,
    });
    assert.equal(sumAmounts(result), 2400 + 120 + 300);
  });

  test("someone who ordered more pays proportionally more tax and tip", () => {
    const result = splitBillWithTaxAndTip({
      items,
      tax: 120,
      tip: 300,
      people,
      assignments: { Drinks: ["Rahul"] }, // Rahul's subtotal is now higher
    });
    const rahul = result.find((r) => r.person === "Rahul").amount;
    const you = result.find((r) => r.person === "You").amount;
    assert.ok(rahul > you);
  });

  test("one person absorbs the whole bill including tax and tip", () => {
    const result = splitBillWithTaxAndTip({
      items,
      tax: 120,
      tip: 300,
      people: ["Solo"],
    });
    assert.deepEqual(result, [{ person: "Solo", amount: 2400 + 120 + 300 }]);
  });

  test("zero people returns an empty array, not an error", () => {
    assert.deepEqual(
      splitBillWithTaxAndTip({ items, tax: 50, tip: 50, people: [] }),
      []
    );
  });

  test("no items but a flat tax/tip still splits (falls back to equal)", () => {
    const result = splitBillWithTaxAndTip({
      items: [],
      tax: 10,
      tip: 20,
      people: ["A", "B"],
    });
    assert.equal(sumAmounts(result), 30);
  });

  test("deterministic sweep: always sums exactly across varied totals/tax/tip/group sizes", () => {
    for (let total = 100; total <= 400; total += 37) {
      for (let tax = 0; tax <= 50; tax += 13) {
        for (let tip = 0; tip <= 80; tip += 19) {
          for (let count = 1; count <= 5; count++) {
            const people = Array.from({ length: count }, (_, i) => `P${i}`);
            const sweepItems = [{ name: "Item", amount: total }];
            const result = splitBillWithTaxAndTip({
              items: sweepItems,
              tax,
              tip,
              people,
            });
            assert.equal(
              sumAmounts(result),
              total + tax + tip,
              `total=${total} tax=${tax} tip=${tip} count=${count} did not sum correctly`
            );
          }
        }
      }
    }
  });
});
