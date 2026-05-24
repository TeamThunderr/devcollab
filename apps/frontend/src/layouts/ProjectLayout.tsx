/**
 * src/layouts/ProjectLayout.tsx
 *
 * Project-level layout. Workspace data is already hydrated by the parent WorkspaceLayout.
 * The WorkspaceLayout provides the MainSidebar and Topbar shell.
 * This layout just acts as a pass-through (for now) to render the child route.
 */

import React from "react";
import { Outlet } from "react-router-dom";

export default function ProjectLayout(): React.ReactElement {
  return <Outlet />;
}
