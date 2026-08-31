import ScreenHeader from "@/components/ScreenHeader";
import Button from "@/components/Button";

// Matches the "Add Bill" screen of the Figma prototype (node 1:29).
//
// Per the approved architecture, SquadPay does manual entry rather than
// real OCR — "Take a photo" / "Upload from gallery" would attach a receipt
// photo as a reference image, then still route through the same mock
// "reading" step (no real photo capture/upload is implemented yet, since
// nothing would be done with the file without real OCR). "Enter manually"
// has nothing to read, so it skips straight to Review Bill.
export default function AddBill() {
  return (
    <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4">
      <ScreenHeader title="Add your bill" backHref="/" />

      <div className="mt-[58px] flex flex-col">
        <Button href="/reading-receipt" variant="accent" className="h-14 w-full">
          Take a photo
        </Button>

        <Button
          href="/reading-receipt"
          variant="secondary"
          className="mt-[38px] h-14 w-full"
        >
          Upload from gallery
        </Button>

        <Button
          href="/review-bill"
          variant="secondary"
          className="mt-[37px] h-14 w-full"
        >
          Enter manually
        </Button>
      </div>

      <p className="mt-[35px] text-sm text-[#A6A6A6]">
        We&rsquo;ll use the receipt to create your split
      </p>
    </div>
  );
}
