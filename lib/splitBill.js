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
 * `assignments` optionally maps an item's name to the people sharing that
 * item (e.g. `{ Drinks: ["You", "Rahul"] }`). There's no screen yet for
 * choosing that per-item — Add People only picks who's in the split at
 * all — so an unassigned item (the normal case for now) falls back to
 * being split evenly across everyone, same as splitEqually would.
 * Passing real assignments in later is a drop-in change, not a rewrite.
 *
 * Any assigned name that isn't in the current `people` list (e.g. someone
 * who was since removed from the bill, or a stale assignment) is filtered
 * out rather than trusted — otherwise their share would be computed and
 * then silently dropped from the returned total, since the final result
 * only ever includes current `people`. If filtering empties an item's
 * owner list entirely, it falls back to splitting across everyone
 * currently in the bill, same as no assignment at all.
 */
export function splitByItem(items, people, assignments = {}) {
  const peopleSet = new Set(people);
  const totals = new Map(people.map((person) => [person, 0]));

  items.forEach((item, itemIndex) => {
    const assignedOwners = assignments[item.name]?.filter((person) =>
      peopleSet.has(person)
    );
    const owners = assignedOwners?.length ? assignedOwners : people;

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
 * Guaranteed to sum to exactly `subtotal + tax + tip` — each of the three
 * components (items, tax, tip) independently sums exactly to its own
 * target amount, so their combination does too.
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
