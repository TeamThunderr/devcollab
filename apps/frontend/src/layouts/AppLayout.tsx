import React from 'react';
import { Outlet } from 'react-router-dom';

export default function AppLayout(): React.ReactElement {
  return (
    <div>
      <Outlet />
    </div>
  );
}
