import React from 'react';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';

interface LogoutButtonProps {
  isFloating?: boolean;
  className?: string;
}

export default function LogoutButton({ isFloating = false, className = '' }: LogoutButtonProps): React.ReactElement {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const baseStyles = "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 border bg-[#17191d] text-slate-300 hover:text-white group";
  
  const floatingStyles = isFloating 
    ? "fixed bottom-5 left-5 z-50 shadow-lg border-white/[0.08] hover:border-red-500/50 hover:bg-red-500/10 hover:shadow-red-500/20" 
    : "w-full border-white/[0.04] hover:border-red-500/30 hover:bg-red-500/10 justify-center";

  return (
    <button
      onClick={handleLogout}
      className={`${baseStyles} ${floatingStyles} ${className}`}
      title="Logout"
    >
      <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-400 transition-colors" />
      <span className="group-hover:text-red-400 transition-colors">Logout</span>
    </button>
  );
}
