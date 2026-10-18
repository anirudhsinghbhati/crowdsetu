import React from 'react';
import { Outlet } from 'react-router-dom';

export const DisplayLayout: React.FC = () => {
  return (
    <div className="w-screen h-screen overflow-hidden select-none bg-black">
      <Outlet />
    </div>
  );
};
