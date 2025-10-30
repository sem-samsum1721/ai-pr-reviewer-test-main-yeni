import { Menu, Bell, User } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 safe-area-top">
      {/* Mobile menu button */}
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 lg:hidden touch-friendly focus-ring rounded-lg hover:bg-gray-100 transition-colors duration-200"
        onClick={onMenuClick}
        aria-label="Kenar çubuğunu aç"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-200 lg:hidden" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1 items-center">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
            YZ PR İnceleme Paneli
          </h2>
        </div>
        
        <div className="flex items-center gap-x-2 sm:gap-x-4 lg:gap-x-6">
          {/* Notifications */}
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 touch-friendly focus-ring rounded-lg hover:bg-gray-100 transition-colors duration-200"
            aria-label="Bildirimleri görüntüle"
          >
            <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />

          {/* Profile */}
          <div className="flex items-center gap-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 transition-colors duration-200">
              <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="hidden sm:block lg:block">
              <p className="text-sm font-medium text-gray-900">Yönetici</p>
              <p className="text-xs text-gray-500 hidden lg:block">admin@company.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}