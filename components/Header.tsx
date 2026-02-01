
import React from 'react';
import { Book } from '../types';
import { Sparkles, Search, Bell } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  currentBook: Book | null;
  toggleAI: () => void;
  isAiOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ activeTab, currentBook, toggleAI, isAiOpen }) => {
  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between z-10">
      <div className="flex items-center gap-4">
        {activeTab === 'reader' && currentBook ? (
          <div>
            <span className="text-sm font-medium text-gray-400 uppercase tracking-widest">Now Reading</span>
            <h2 className="text-lg font-bold text-gray-800 line-clamp-1">{currentBook.title}</h2>
          </div>
        ) : (
          <h2 className="text-lg font-bold text-gray-800 capitalize">{activeTab}</h2>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search your library..." 
            className="pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-4 border-l pl-6 border-gray-200">
          <button 
            onClick={toggleAI}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
              isAiOpen 
                ? 'bg-indigo-600 text-white shadow-inner' 
                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
            }`}
          >
            <Sparkles size={18} />
            AI Assistant
          </button>
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            <Bell size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
