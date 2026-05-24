import React from "react";
import { Navigate, useParams } from "react-router-dom";

export default function ProjectView(): React.ReactElement {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  return <Navigate to={`/${workspaceId || "default"}/projects/project-test-456`} replace />;
}

