// import { Suspense } from "react";
// import DashboardClient from "./DashboardClient";

// export default function DashboardPage() {
//   return (
//     <Suspense fallback={null}>
//       <DashboardClient />
//     </Suspense>
//   );
// }

import { Suspense } from "react";
import DashboardClient from "./DashboardClient";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      }
    >
      <DashboardClient />
    </Suspense>
  );
}
