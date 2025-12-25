import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
// Importing User type for ChatProps
import { User } from '../types';

// Defining ChatProps to resolve "Cannot find name 'ChatProps'" error
interface ChatProps {
  user: User;
  onLogout: () => void;
}

// ... rest of imports unchanged

const Dashboard: React.FC<ChatProps> = ({ user, onLogout }) => {
  // ... rest of state/logic unchanged

  return (
    <div className="fixed inset-0 h-screen w-full bg-black text-zinc-200 overflow-hidden font-sans relative z-[100]">
      {/* Container is fixed inset-0 to ensure it doesn't scroll with the landing page body */}
      
      <div className="flex h-full w-full relative">
        <div className="absolute top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
           {/* ... toast logic ... */}
        </div>
        
        {/* ... rest of the dashboard UI ... */}
      </div>
    </div>
  );
};

// Exporting Dashboard as default to resolve the import error in App.tsx
export default Dashboard;

// ... rest of file unchanged