
import React, { useState, useEffect } from 'react';
import { Book, BookFormat } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LibraryView from './components/LibraryView';
import ReaderView from './components/ReaderView';
import ConverterView from './components/ConverterView';
import AIAssistant from './components/AIAssistant';
import { getAllBooksFromDB, saveBookToDB, deleteBookFromDB } from './services/storage';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'library' | 'reader' | 'converter'>('library');
  const [books, setBooks] = useState<Book[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
      if (!['epub', 'pdf', 'mobi', 'fb2', 'txt', 'rtf'].includes(format)) return;

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
   * 采用乐观更新策略：先删 UI，后异步删数据库，失败则回滚
   */
  const deleteBook = async (id: string) => {
    if (!window.confirm('确定要删除这本书吗？此操作不可撤销。')) return;

    const originalBooks = [...books];
    const bookToDelete = books.find(b => b.id === id);

    // 1. 如果正在阅读这本书，先退出阅读模式
    if (currentBook?.id === id) {
      setCurrentBook(null);
      if (activeTab === 'reader') {
        setActiveTab('library');
      }
    }

    // 2. 乐观更新 UI
    setBooks(prev => prev.filter(b => b.id !== id));

    try {
      // 3. 执行真正的数据库删除
      await deleteBookFromDB(id);
      console.log(`[App] 书籍 ${id} 已从数据库移除`);
    } catch (e) {
      console.error("[App] 数据库删除失败，执行 UI 回滚", e);
      // 4. 失败则回滚
      setBooks(originalBooks);
      if (bookToDelete && currentBook?.id === id) {
        setCurrentBook(bookToDelete);
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
                <LibraryView books={books} onOpen={openReader} onDelete={deleteBook} />
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
      </main>
    </div>
  );
};

export default App;
