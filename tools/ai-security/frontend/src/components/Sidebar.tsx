import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Apple, 
  User, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onMobileClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, onMobileClose }) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/nutrition', icon: Apple, label: 'Nutrition' },
    { path: '/security-reports', icon: Shield, label: 'Security Reports' },
    { path: '/profile', icon: User, label: 'Profile' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const handleLogout = () => {
    logout();
  };

  const handleNavClick = () => {
    // Close mobile menu when a navigation item is clicked
    if (onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <div className={`bg-white shadow-lg border-r border-gray-200 transition-all duration-300 ease-in-out h-full ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!collapsed && (
          <h1 className="text-xl font-bold text-gray-900">Health Agent</h1>
        )}
        <div className="flex items-center space-x-2">
          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
          {/* Desktop toggle button */}
          <button
            onClick={onToggle}
            className="hidden lg:block p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* User Info */}
      {!collapsed && user && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 truncate">{user.username}</p>
              <p className="text-sm text-gray-500 truncate">{user.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="p-4 flex-1">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            // Skip admin-only items for non-admin users
            if ((item as any).adminOnly && user?.role !== 'admin') {
              return null;
            }
            
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="truncate">Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
