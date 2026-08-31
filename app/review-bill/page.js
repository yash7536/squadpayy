import ScreenHeader from "@/components/ScreenHeader";
import Button from "@/components/Button";
import { mockReceiptItems, mockReceiptTotal } from "@/lib/mockBill";

// Matches the "Review Script" screen of the Figma prototype (node 2:27).
//
// The items shown here are mock data (see lib/mockBill.js) — this phase
// reproduces the designed review experience, it doesn't do real receipt
// extraction.
export default function ReviewBill() {
  return (
    <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4 pb-14">
      <ScreenHeader title="Review your bill" backHref="/add-bill" />

      <p className="mt-[14px] text-sm text-black">Receipt Total</p>
      <p className="mt-[5px] text-2xl font-semibold text-black">
        Rs.{mockReceiptTotal.toLocaleString("en-IN")}
      </p>

      <h2 className="mt-[49px] text-2xl font-semibold text-black">
        Detected items
      </h2>

      <div className="mt-[5px] flex flex-col">
        {mockReceiptItems.map((item, index) => (
          <div
            key={item.name}
            className={`flex h-14 w-full items-center justify-center rounded-[10px] bg-[#E6DDDD] text-base text-black ${
              index === 0 ? "" : "mt-[22px]"
            }`}
          >
            {item.name} - Rs.{item.amount}
          </div>
        ))}
      </div>

      <p className="mt-[22px] text-sm text-[#ABABAB]">
        Does something look wrong? Edit before continuing.
      </p>

      <Button
        href="/split-bill"
        variant="dark"
        className="mt-[22px] h-14 w-full"
      >
        Continue to split
      </Button>
    </div>
  );
}
