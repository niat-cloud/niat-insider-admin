import { Suspense } from "react";
import { GuidesClient } from "./GuidesClient";

export default function GuidesPage() {
  return (
    <Suspense fallback={null}>
      <GuidesClient />
    </Suspense>
  );
}
