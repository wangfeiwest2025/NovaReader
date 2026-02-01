
import React from 'react';
import { Book } from '../types';
import { Trash2, Play, Book as BookIcon } from 'lucide-react';

interface LibraryViewProps {
  books: Book[];
  onOpen: (book: Book) => void;
  onDelete: (id: string) => void;
}

const LibraryView: React.FC<LibraryViewProps> = ({ books, onOpen, onDelete }) => {
  return (
    <div className="p-8 pb-32">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h3 className="text-3xl font-black text-gray-900 tracking-tight">我的藏书</h3>
          <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase mt-2 tracking-widest">
            <BookIcon size={14} />
            <span>LIBRARY • {books.length} ITEMS</span>
          </div>
        </div>
      </div>

      {books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-48 border-2 border-dashed border-gray-200 rounded-[3rem] bg-gray-50/30">
           <p className="text-gray-400 font-black text-lg">书库目前是空的</p>
           <p className="text-gray-400 text-sm mt-2">点击侧边栏添加书籍</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
          {books.map((book) => (
            <div key={book.id} className="relative group animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              <div className="flex flex-col h-full">
                
                {/* 
                  Card Container
                  Uses a relative wrapper to position children.
                */}
                <div className="relative aspect-[3/4.2] rounded-2xl shadow-md transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-2 bg-gray-100 border border-gray-100">
                  
                  {/* 
                     1. Book Cover & Open Action Layer
                     This occupies the full space. Clicking here opens the book.
                  */}
                  <div 
                    className="absolute inset-0 rounded-2xl overflow-hidden cursor-pointer z-0"
                    onClick={() => onOpen(book)}
                    title={`阅读 ${book.title}`}
                  >
                    <img 
                      src={book.cover} 
                      alt={book.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 pointer-events-none"
                      loading="lazy"
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                    <div className="absolute top-2 left-2 z-10 bg-black/40 backdrop-blur-md text-white/90 text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider shadow-sm border border-white/10 pointer-events-none">
                      {book.format}
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30 shadow-2xl">
                          <Play fill="currentColor" size={20} className="ml-1" />
                        </div>
                    </div>
                  </div>

                  {/* 
                     2. Delete Button Layer
                     Completely separate sibling, higher z-index (50).
                     Explicit click handling with stopPropagation.
                  */}
                  <div className="absolute top-2 right-2 z-50">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onDelete(book.id);
                      }}
                      className="w-9 h-9 bg-white/90 backdrop-blur text-gray-500 hover:text-white hover:bg-red-500 rounded-xl flex items-center justify-center shadow-lg transition-all duration-200 cursor-pointer opacity-100 sm:opacity-0 group-hover:opacity-100 active:scale-90"
                      title="删除图书"
                    >
                      <Trash2 size={18} className="pointer-events-none" />
                    </button>
                  </div>

                </div>
                
                {/* Footer Info */}
                <div className="mt-3 px-1">
                  <h4 
                    onClick={() => onOpen(book)}
                    className="font-bold text-gray-900 line-clamp-2 text-[13px] leading-snug hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    {book.title}
                  </h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-tight truncate">{book.author}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LibraryView;
