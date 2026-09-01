// Pure calculation functions for the two split methods on "Split the bill",
// plus tax/tip proportional splitting (Phase 10 Part K). No UI, no
// Supabase — just math, so it's easy to verify independently and easy to
// reuse once splitting is wired to real bills/people later. See
// splitBill.test.mjs for the automated test suite covering these.

/**
 * Split a whole-rupee amount equally among a list of people.
 *
 * If it doesn't divide evenly, the leftover rupees go one-each to people
 * starting at `remainderStartIndex` (wrapping around), so the returned
 * amounts always sum to exactly `totalAmount` — nobody's total quietly
 * loses or gains a rupee to rounding.
 *
 * `remainderStartIndex` defaults to 0 (first person gets priority), but
 * splitByItem rotates it per item — otherwise, across several items that
 * each round unevenly, the same person would absorb every leftover rupee
 * instead of it evening out. See splitByItem for why that matters.
 */
export function splitEqually(totalAmount, people, remainderStartIndex = 0) {
  if (people.length === 0) return [];

  const baseShare = Math.floor(totalAmount / people.length);
  const remainder = totalAmount - baseShare * people.length;

  return people.map((person, index) => {
    const distanceFromStart =
      (index - remainderStartIndex + people.length) % people.length;
    return {
      person,
      amount: baseShare + (distanceFromStart < remainder ? 1 : 0),
    };
  });
}

/**
 * Split a list of `{ name, amount }` receipt items by who ordered each
 * one.
 *
 * `assignments` maps an item's name to the people sharing that item (e.g.
 * `{ Drinks: ["You", "Rahul"] }`). Three distinct cases, each handled
 * deliberately differently:
 *
 * 1. `assignments[item.name]` is missing entirely (no key at all) — the
 *    caller isn't tracking per-item assignment for this item, so it falls
 *    back to splitting evenly across everyone, same as splitEqually
 *    would. This is what makes passing real assignments in a drop-in
 *    change rather than a rewrite for any caller that doesn't build a
 *    full assignments map.
 * 2. `assignments[item.name]` is present but genuinely empty (`[]`) — a
 *    real UI state meaning "nobody has been assigned to this item yet"
 *    (see app/review-send/ReviewSendClient.js, where "Split by item"
 *    starts every item unassigned on purpose, so it's visibly different
 *    from "Split equally" instead of silently defaulting to the same
 *    even split). This item contributes NOTHING to anyone's total until
 *    someone is actually assigned — there's no fair person to guess.
 *    Callers must treat a result missing some of an item's cost as
 *    incomplete (see splitBillWithTaxAndTip's doc comment).
 * 3. `assignments[item.name]` is present and non-empty, but every named
 *    person has since left `people` (a stale assignment — e.g. someone
 *    was removed from the bill after being assigned this item) — falls
 *    back to everyone, same as case 1, so that person leaving doesn't
 *    silently drop this item's cost from the total.
 */
export function splitByItem(items, people, assignments = {}) {
  const peopleSet = new Set(people);
  const totals = new Map(people.map((person) => [person, 0]));

  items.forEach((item, itemIndex) => {
    const rawAssignment = assignments[item.name];
    let owners;
    if (!Array.isArray(rawAssignment)) {
      owners = people; // case 1: no assignment info at all
    } else if (rawAssignment.length === 0) {
      owners = []; // case 2: genuinely, currently unassigned
    } else {
      const filtered = rawAssignment.filter((person) => peopleSet.has(person));
      owners = filtered.length > 0 ? filtered : people; // case 3 falls back
    }

    // Nobody owns this item yet — it contributes nothing this pass, not
    // an equal share for everyone. (Also guards against itemIndex %
    // owners.length below, which would be a divide-by-zero otherwise.)
    if (owners.length === 0) return;

    // Rotate which owner gets priority on a leftover rupee, item by item,
    // so uneven item prices don't all favor the same person.
    const remainderStartIndex = itemIndex % owners.length;
    const share = splitEqually(item.amount, owners, remainderStartIndex);

    for (const { person, amount } of share) {
      totals.set(person, (totals.get(person) ?? 0) + amount);
    }
  });

  return people.map((person) => ({ person, amount: totals.get(person) }));
}

/**
 * Splits a whole-rupee `amount` (tax or tip) among `people` in proportion
 * to each person's `subtotalByPerson` (a Map of person -> their share of
 * the items subtotal) — the standard, fair way to split tax/tip: someone
 * who ordered more pays more tax on what they ordered, rather than
 * everyone paying an equal flat amount regardless.
 *
 * Uses the "largest remainder" apportionment method: compute each
 * person's exact (possibly fractional) ideal share, floor it, then hand
 * out the few rupees left over one-by-one to whoever's ideal share had
 * the largest fractional part. This is the standard fair way to round
 * *unequal* proportional shares so they still sum exactly to `amount` —
 * the flat index-rotation splitEqually uses isn't applicable here,
 * because unlike an equal split, people's ideal shares aren't identical
 * to begin with, so there's no single "whose turn is it" to rotate
 * through.
 *
 * If nobody has any subtotal to be proportional to (e.g. no items were
 * ever priced), falls back to splitting the amount equally instead of
 * dividing by zero.
 */
export function splitProportionally(amount, people, subtotalByPerson) {
  if (people.length === 0) return [];

  const totalSubtotal = people.reduce(
    (sum, person) => sum + (subtotalByPerson.get(person) ?? 0),
    0
  );
  if (totalSubtotal === 0) {
    return splitEqually(amount, people);
  }

  const idealShares = people.map(
    (person) => (amount * (subtotalByPerson.get(person) ?? 0)) / totalSubtotal
  );
  const flooredShares = idealShares.map((value) => Math.floor(value));
  const flooredTotal = flooredShares.reduce((sum, value) => sum + value, 0);
  let remainder = amount - flooredTotal;

  const byLargestFraction = people
    .map((_, index) => ({
      index,
      fraction: idealShares[index] - flooredShares[index],
    }))
    .sort((a, b) => b.fraction - a.fraction);

  const amounts = [...flooredShares];
  for (let i = 0; i < byLargestFraction.length && remainder > 0; i++, remainder--) {
    amounts[byLargestFraction[i].index] += 1;
  }

  return people.map((person, index) => ({ person, amount: amounts[index] }));
}

/**
 * Full bill split: items (by assignment, same as splitByItem), plus tax
 * and tip distributed proportionally to each person's item subtotal.
 *
 * Sums to exactly `subtotal + tax + tip` PROVIDED every item has at least
 * one owner in `assignments` — tax/tip always divide their own amount
 * exactly (splitProportionally's guarantee), but an item with a genuinely
 * empty assignment (splitByItem case 2 — "not assigned yet") contributes
 * nothing, so the total falls short by that item's price until someone is
 * assigned to it. Callers that let a sender build assignments
 * incrementally (see app/review-send/ReviewSendClient.js) should check
 * every item has an owner before trusting this sums to the full bill.
 */
export function splitBillWithTaxAndTip({
  items,
  tax = 0,
  tip = 0,
  people,
  assignments = {},
}) {
  if (people.length === 0) return [];

  const itemShares = splitByItem(items, people, assignments);
  const subtotalByPerson = new Map(
    itemShares.map(({ person, amount }) => [person, amount])
  );

  const taxByPerson = new Map(
    splitProportionally(tax, people, subtotalByPerson).map(
      ({ person, amount }) => [person, amount]
    )
  );
  const tipByPerson = new Map(
    splitProportionally(tip, people, subtotalByPerson).map(
      ({ person, amount }) => [person, amount]
    )
  );

  return people.map((person) => ({
    person,
    amount:
      (subtotalByPerson.get(person) ?? 0) +
      (taxByPerson.get(person) ?? 0) +
      (tipByPerson.get(person) ?? 0),
  }));
}
