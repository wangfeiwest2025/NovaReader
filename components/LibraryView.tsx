
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
    <div className="p-8">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-10">
          {books.map((book) => (
            <div key={book.id} className="relative group animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              <div className="flex flex-col h-full">
                {/* 封面区域容器 */}
                <div className="relative">
                  
                  {/* 可点击的封面 */}
                  <div 
                    className="aspect-[3/4.2] rounded-2xl shadow-md cursor-pointer overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 bg-gray-100 group-active:scale-95 z-0 relative"
                    onClick={() => onOpen(book)}
                  >
                    <img 
                      src={book.cover} 
                      alt={book.title} 
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    
                    {/* 格式标签 */}
                    <div className="absolute top-2 left-2 z-10 bg-indigo-600/90 backdrop-blur-sm text-white text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider shadow-sm">
                      {book.format}
                    </div>

                    {/* 悬停播放图标 */}
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-12 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-indigo-600 shadow-2xl scale-0 group-hover:scale-100 transition-transform duration-300">
                        <Play fill="currentColor" size={20} className="ml-1" />
                      </div>
                    </div>
                  </div>

                  {/* 删除按钮 - 常驻显示，不再依赖 Hover */}
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDelete(book.id);
                    }}
                    className="absolute -top-3 -right-3 z-50 w-8 h-8 bg-white text-gray-400 hover:text-white hover:bg-red-500 rounded-full flex items-center justify-center shadow-lg border border-gray-100 transition-all duration-200 cursor-pointer"
                    title="删除图书"
                    aria-label="Delete book"
                  >
                    <Trash2 size={14} />
                  </button>

                </div>
                
                {/* 文字信息 */}
                <div className="mt-4 px-1">
                  <h4 
                    onClick={() => onOpen(book)}
                    className="font-bold text-gray-900 line-clamp-2 text-[13px] leading-snug group-hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    {book.title}
                  </h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-tight">{book.author}</p>
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
