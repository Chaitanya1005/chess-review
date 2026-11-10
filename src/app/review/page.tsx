import type { Metadata } from "next";
import { ReviewScreen } from "@/components/review/ReviewScreen";

export const metadata: Metadata = {
  title: "Game review — Chess Review",
};

export default function ReviewPage() {
  return (
    <main className="flex w-full flex-1 flex-col">
      <ReviewScreen />
    </main>
  );
}
