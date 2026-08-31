// Pure calculation functions for the two split methods on "Split the bill".
// No UI, no Supabase — just math, so it's easy to verify independently and
// easy to reuse once splitting is wired to real bills/people later.

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
 * choosing that per-item — Add People (Phase 5) only picks who's in the
 * split at all — so an unassigned item (the normal case for now) falls
 * back to being split evenly across everyone, same as splitEqually would.
 * Passing real assignments in later is a drop-in change, not a rewrite.
 */
export function splitByItem(items, people, assignments = {}) {
  const totals = new Map(people.map((person) => [person, 0]));

  items.forEach((item, itemIndex) => {
    const owners = assignments[item.name]?.length
      ? assignments[item.name]
      : people;

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
