
import React, { useState, useEffect } from 'react';
import { Book, BookFormat } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LibraryView from './components/LibraryView';
import ReaderView from './components/ReaderView';
import ConverterView from './components/ConverterView';
import AIAssistant from './components/AIAssistant';
import { getAllBooksFromDB, saveBookToDB, deleteBookFromDB } from './services/storage';
import { AlertTriangle, X } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'library' | 'reader' | 'converter'>('library');
  const [books, setBooks] = useState<Book[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Delete Confirmation State
  const [bookToDelete, setBookToDelete] = useState<string | null>(null);

  useEffect(() => {
    const loadBooks = async () => {
      try {
        const storedBooks = await getAllBooksFromDB();
        setBooks(storedBooks);
      } catch (e) {
        console.error("Failed to load books from IndexedDB", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadBooks();
  }, []);

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const format = file.name.split('.').pop()?.toLowerCase() as BookFormat;
      if (!['epub', 'pdf', 'mobi', 'fb2', 'txt', 'rtf', 'azw3'].includes(format)) return;

      const reader = new FileReader();
      
      reader.onload = async () => {
        const result = reader.result;
        if (!result) return;

        let content: string | ArrayBuffer = result;
        
        if (['txt', 'fb2', 'rtf'].includes(format) && result instanceof ArrayBuffer) {
          const decoder = new TextDecoder('utf-8', { fatal: true });
          try {
            content = decoder.decode(new Uint8Array(result));
          } catch (e) {
            const gbkDecoder = new TextDecoder('gbk');
            content = gbkDecoder.decode(new Uint8Array(result));
          }
        }

        const newBook: Book = {
          id: 'book-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
          title: file.name.replace(/\.[^/.]+$/, ""),
          author: 'Unknown Author',
          format,
          content: content,
          addedAt: Date.now(),
          cover: `https://picsum.photos/seed/${Math.random()}/400/600`
        };
        
        try {
          await saveBookToDB(newBook);
          setBooks(prev => [newBook, ...prev]);
        } catch (err) {
          console.error("Save to DB failed", err);
        }
      };

      reader.readAsArrayBuffer(file);
    });
    
    e.target.value = '';
  };

  const openReader = (book: Book) => {
    setCurrentBook(book);
    setActiveTab('reader');
  };

  /**
   * Request deletion (Opens Modal)
   */
  const requestDelete = (id: string) => {
    setBookToDelete(id);
  };

  /**
   * Execute actual deletion logic
   */
  const confirmDelete = async () => {
    if (!bookToDelete) return;
    
    const id = bookToDelete;
    setBookToDelete(null); // Close modal immediately

    const originalBooks = [...books];
    const targetBook = books.find(b => b.id === id);

    // 1. Exit reader if current book
    if (currentBook?.id === id) {
      setCurrentBook(null);
      if (activeTab === 'reader') {
        setActiveTab('library');
      }
    }

    // 2. Optimistic UI Update
    setBooks(prev => prev.filter(b => b.id !== id));

    try {
      // 3. Database Deletion
      await deleteBookFromDB(id);
      console.log(`[App] 书籍 ${id} 已从数据库移除`);
    } catch (e) {
      console.error("[App] 数据库删除失败，执行 UI 回滚", e);
      // 4. Rollback on failure
      setBooks(originalBooks);
      if (targetBook && currentBook?.id === id) {
        setCurrentBook(targetBook);
      }
      alert("删除失败，数据库访问受限。书籍已恢复显示。");
    }
  };

  return (
    <div className="flex h-screen w-full bg-white text-gray-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onImport={handleFileImport} />
      
      <main className="flex-1 flex flex-col relative overflow-hidden bg-white">
        {activeTab !== 'reader' && (
          <Header 
            activeTab={activeTab}
            currentBook={currentBook}
            toggleAI={() => setIsAiOpen(!isAiOpen)}
            isAiOpen={isAiOpen}
          />
        )}
        
        <div className={`flex-1 ${activeTab === 'reader' ? 'overflow-hidden' : 'overflow-auto'} bg-[#fafafa]`}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
              <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">初始化...</p>
            </div>
          ) : (
            <>
              {activeTab === 'library' && (
                <LibraryView books={books} onOpen={openReader} onDelete={requestDelete} />
              )}
              {activeTab === 'reader' && currentBook && (
                <ReaderView book={currentBook} onBack={() => setActiveTab('library')} />
              )}
              {activeTab === 'converter' && (
                <ConverterView books={books} />
              )}
            </>
          )}
        </div>

        <AIAssistant 
          isOpen={isAiOpen} 
          onClose={() => setIsAiOpen(false)} 
          contextBook={currentBook}
        />

        {/* Custom Delete Confirmation Modal */}
        {bookToDelete && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 transform transition-all scale-100 border border-gray-100">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">删除书籍</h3>
              </div>
              
              <p className="text-gray-500 mb-6 text-sm leading-relaxed">
                您确定要永久删除这本书吗？<br/>此操作无法撤销，书籍数据将从本地存储中清除。
              </p>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setBookToDelete(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;
