// TEMP — replace with real implementation (branded auth pages, marketing copy)

import React from "react";
import { Outlet } from "react-router-dom";

export default function AuthLayout(): React.ReactElement {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Outlet />
    </div>
  );
}
