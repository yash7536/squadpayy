import { redirect } from "next/navigation";
import ScreenHeader from "@/components/ScreenHeader";
import Button from "@/components/Button";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getLatestBillWithRequests } from "@/lib/paymentRequestsDb";

export const dynamic = "force-dynamic";

// Matches the "Payment Status" screen of the Figma prototype (node 2:190).
//
// A Server Component reading straight from Supabase, scoped to the
// signed-in sender's own session — every number here (total, each
// person's status, the progress bar, "X of Y people have paid") is
// computed from the database's current data for THIS user, not hardcoded
// to Figma's example numbers and not visible to any other user (Row
// Level Security, not just an application-level filter).
export default async function PaymentStatus() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/payment-status");
  }

  const bill = await getLatestBillWithRequests({ supabase, ownerId: user.id });

  if (!bill) {
    return (
      <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4">
        <ScreenHeader title="Payment status" backHref="/review-send" />
        <p className="mt-[14px] text-sm text-black">
          No payment requests yet — send some from Review &amp; Send first.
        </p>
      </div>
    );
  }

  const { billLabel, totalAmount, requests } = bill;
  const paidCount = requests.filter((request) => request.status === "paid").length;
  const firstPending = requests.find((request) => request.status === "pending");
  const allPaid = !firstPending;
  const progressWidth = Math.round((paidCount / requests.length) * 280);

  return (
    <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4">
      <ScreenHeader title="Payment status" backHref="/review-send" />

      <p className="mt-[14px] text-sm text-black">{billLabel}</p>
      <div className="mt-[7px] flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-black">
          Rs.{totalAmount.toLocaleString("en-IN")}
        </p>
        <p className="text-sm text-black">total</p>
      </div>

      <div className="mt-[70px] flex flex-col">
        {requests.map((request, index) => (
          <div
            key={request.token ?? request.person}
            className={`flex h-14 w-full items-center justify-between rounded-[10px] bg-[#D9D9D9] px-4 text-black ${
              index === 0 ? "" : "mt-[12px]"
            }`}
          >
            <div className="flex flex-col">
              <span className="text-base leading-tight">{request.person}</span>
              <span className="text-xs leading-tight capitalize">
                {request.status}
              </span>
            </div>
            <span className="text-base">Rs.{request.amount}</span>
          </div>
        ))}
      </div>

      <p className="mt-[15px] text-sm text-[#C0C0C0]">
        {paidCount} of {requests.length} people have paid
      </p>

      <div className="mt-[5px] h-[6px] w-[280px] bg-[#D9D9D9]">
        <div
          className="h-[6px] bg-[#737373]"
          style={{ width: `${progressWidth}px` }}
        />
      </div>

      {allPaid ? (
        <Button href="/payment-complete" variant="dark" className="mt-[22px] h-14 w-full">
          View summary
        </Button>
      ) : (
        <Button
          href={`/payment-reminder/${firstPending.token}`}
          variant="dark"
          className="mt-[22px] h-14 w-full"
        >
          Remind {firstPending.person}
        </Button>
      )}
    </div>
  );
}
