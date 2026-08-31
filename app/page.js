import Button from "@/components/Button";

// Matches the "Home" screen of the Figma prototype (node 1:11).
export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4 pt-16">
      <p className="text-2xl font-semibold text-black">SquadPay</p>

      <h1 className="mt-10 text-[28px] font-semibold leading-tight text-black">
        Get paid without the awkward conversation
      </h1>

      <p className="mt-[21px] text-base text-black">
        Upload a bill, split it with your group, and let SquadPay handle the
        follow-up
      </p>

      <div className="flex-1" />

      <Button href="/add-bill" variant="primary" className="mx-auto mb-14 h-[52px] w-[300px]">
        Upload a bill
      </Button>
    </div>
  );
}
