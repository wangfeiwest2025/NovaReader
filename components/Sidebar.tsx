
import React, { useRef } from 'react';
import { BookOpen, Library, RefreshCcw, Plus, Settings } from 'lucide-react';

interface SidebarProps {
  activeTab: 'library' | 'reader' | 'converter';
  setActiveTab: (tab: 'library' | 'reader' | 'converter') => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navItems = [
    { id: 'library', label: 'Library', icon: Library },
    { id: 'reader', label: 'Reader', icon: BookOpen },
    { id: 'converter', label: 'Converter', icon: RefreshCcw },
  ];

  return (
    <aside className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col p-4">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg">
          <BookOpen size={24} />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-gray-800">NovaReader</h1>
      </div>

      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full mb-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
      >
        <Plus size={20} />
        <span className="font-semibold">Add Book</span>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          multiple 
          accept=".epub,.pdf,.mobi,.fb2,.txt,.rtf"
          onChange={onImport}
        />
      </button>

      <nav className="space-y-1 flex-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${
              activeTab === item.id 
                ? 'bg-indigo-50 text-indigo-600' 
                : 'text-gray-500 hover:bg-gray-200'
            }`}
          >
            <item.icon size={20} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="border-t border-gray-200 pt-4">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-200 transition-colors font-medium">
          <Settings size={20} />
          Settings
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
