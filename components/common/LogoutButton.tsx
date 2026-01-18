import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

interface LogoutButtonProps {
  variant?: 'button' | 'link';
  className?: string;
  showIcon?: boolean;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ 
  variant = 'button', 
  className = '',
  showIcon = true 
}) => {
  const { logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc muốn đăng xuất?')) {
      logout();
    }
  };

  if (variant === 'link') {
    return (
      <button
        onClick={handleLogout}
        className={`flex items-center gap-2 text-gray-700 hover:text-red-600 transition-colors ${className}`}
      >
        {showIcon && <ArrowRightOnRectangleIcon className="w-5 h-5" />}
        <span>Đăng xuất</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg
        bg-red-500 hover:bg-red-600 text-white
        transition-colors duration-200
        ${className}
      `}
    >
      {showIcon && <ArrowRightOnRectangleIcon className="w-5 h-5" />}
      <span>Đăng xuất</span>
    </button>
  );
};

export default LogoutButton;