/**
 * The canonical evaluation dataset: exactly 15 receipt IDs. This is the
 * single source of truth for "exactly 15 receipts" — `npm run eval:receipts`
 * iterates precisely this list, not whatever files happen to exist on disk,
 * so the dataset size is enforced by construction rather than convention.
 *
 * Each ID `receipt-NN` corresponds to:
 *  - eval/dataset/ground-truth/receipt-NN.json (human-entered, required)
 *  - eval/dataset/receipts/<imageFile from that ground-truth file> (the photo)
 */
export const RECEIPT_IDS: readonly string[] = [
  "receipt-01",
  "receipt-02",
  "receipt-03",
  "receipt-04",
  "receipt-05",
  "receipt-06",
  "receipt-07",
  "receipt-08",
  "receipt-09",
  "receipt-10",
  "receipt-11",
  "receipt-12",
  "receipt-13",
  "receipt-14",
  "receipt-15",
];
