import { Suspense } from "react";
import { HomeLanding } from "@/components/home-landing";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeLanding />
    </Suspense>
  );
}
