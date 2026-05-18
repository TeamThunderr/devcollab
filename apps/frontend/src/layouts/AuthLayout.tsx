import React from 'react';
import { Outlet } from 'react-router-dom';

export default function AuthLayout(): React.ReactElement {
  return (
    <div>
      <Outlet />
    </div>
  );
}
