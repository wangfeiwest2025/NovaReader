
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Book, ReadingSettings } from '../types';
import { ChevronLeft, ChevronRight, Settings, ArrowLeft, Loader2, Type, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';

interface ReaderViewProps {
  book: Book;
  onBack: () => void;
}

const ReaderView: React.FC<ReaderViewProps> = ({ book, onBack }) => {
  const [settings, setSettings] = useState<ReadingSettings>({
    fontSize: 18,
    lineHeight: 1.6,
    theme: 'sepia',
    fontFamily: 'serif'
  });

  const [showSettings, setShowSettings] = useState(false);
  const [engineLoading, setEngineLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState({ current: 1, total: 1, label: '准备中...' });
  const [parsedElements, setParsedElements] = useState<React.ReactNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // PDF state
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const pageNumRef = useRef(1); // Track pageNum for resize handler

  const renditionRef = useRef<any>(null);
  const bookInstanceRef = useRef<any>(null);
  // Ref for the paper element itself (inner container)
  const viewerRef = useRef<HTMLDivElement>(null); 
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const resizeTimeoutRef = useRef<any>(null);

  useEffect(() => {
    pageNumRef.current = pageNum;
  }, [pageNum]);

  const themeConfig = {
    dark: { bg: '#121212', text: '#d1d5db', paper: '#1e1e1e', border: '#333' },
    sepia: { bg: '#f4ecd8', text: '#5b4636', paper: '#fbf7ed', border: '#e0d5ba' },
    light: { bg: '#f3f4f6', text: '#111827', paper: '#ffffff', border: '#e5e7eb' }
  }[settings.theme];

  const prevPage = useCallback(() => {
    if (book.format === 'epub' && renditionRef.current) {
      renditionRef.current.prev();
    } else if (book.format === 'pdf' && pdfDoc) {
      setPageNum(prev => Math.max(1, prev - 1));
    } else if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollBy({ top: -container.clientHeight * 0.8, behavior: 'smooth' });
    }
  }, [book.format, pdfDoc]);

  const nextPage = useCallback(() => {
    if (book.format === 'epub' && renditionRef.current) {
      renditionRef.current.next();
    } else if (book.format === 'pdf' && pdfDoc) {
      setPageNum(prev => Math.min(pdfDoc.numPages, prev + 1));
    } else if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollBy({ top: container.clientHeight * 0.8, behavior: 'smooth' });
    }
  }, [book.format, pdfDoc]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevPage();
      if (e.key === 'ArrowRight' || e.key === ' ') nextPage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevPage, nextPage]);

  // PDF Render Logic
  const renderPdfPage = async (num: number, doc: any) => {
    if (!doc || !pdfCanvasRef.current) return;
    try {
      const page = await doc.getPage(num);
      const canvas = pdfCanvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      const viewport = page.getViewport({ scale: 1.5 });
      const containerWidth = viewerRef.current?.parentElement?.clientWidth || 800;
      // Limit max width to avoid massive canvas on large screens
      const targetWidth = Math.min(containerWidth - 40, 1000); 
      const scale = targetWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale: scale * 1.5 }); // Higher internal resolution

      canvas.height = scaledViewport.height;
      canvas.width = scaledViewport.width;
      canvas.style.width = "100%";
      canvas.style.height = "auto";

      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport,
      };
      await page.render(renderContext).promise;
      setCurrentPage({
        current: num,
        total: doc.numPages,
        label: `第 ${num} / ${doc.numPages} 页`
      });
    } catch (err) {
      console.error("PDF Render Error:", err);
    }
  };

  useEffect(() => {
    if (book.format === 'pdf' && pdfDoc) {
      renderPdfPage(pageNum, pdfDoc);
    }
  }, [pageNum, pdfDoc]);

  // Parse FB2/TXT
  const parseContent = (content: string | ArrayBuffer) => {
    // If content is ArrayBuffer (likely not detached here due to upstream checks, but safer to check or clone if needed)
    // However, for TXT/FB2 we usually decode immediately in App or here.
    const text = typeof content === 'string' ? content : new TextDecoder("utf-8").decode(content);
    
    if (book.format === 'fb2') {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        const body = xmlDoc.getElementsByTagName("body")[0];
        if (!body) return [<p key="err">无法解析 FB2 内容。</p>];
        
        const elements: React.ReactNode[] = [];
        const processNode = (node: Node, keyPrefix: string) => {
          if (node.nodeType === 1) {
            const el = node as Element;
            const tag = el.tagName.toLowerCase();
            const key = `${keyPrefix}-${Math.random().toString(36).substr(2, 5)}`;
            
            if (tag === 'title') {
               elements.push(<h2 key={key} className="text-2xl font-bold text-center my-8 border-b pb-4">{el.textContent}</h2>);
            } else if (tag === 'p') {
               elements.push(<p key={key} className="mb-4 indent-8 text-justify leading-relaxed">{el.textContent}</p>);
            } else if (tag === 'section') {
               node.childNodes.forEach((child, i) => processNode(child, `${key}-${i}`));
            }
          }
        };
        body.childNodes.forEach((node, i) => processNode(node, `node-${i}`));
        return elements;
      } catch (e) {
        return [<p key="err">FB2 解析失败。</p>];
      }
    } else {
      // TXT handling
      return text.split('\n').map((l, i) => {
        const line = l.trim();
        return line ? <p key={i} className="mb-4 min-h-[1em] indent-8 leading-relaxed text-justify break-words">{line}</p> : <br key={i}/>;
      });
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initReader = async () => {
      setEngineLoading(true);
      setError(null);

      try {
        if (book.format === 'epub') {
          if (bookInstanceRef.current) await bookInstanceRef.current.destroy();
          while (!(window as any).ePub) { await new Promise(r => setTimeout(r, 100)); }
          
          // CRITICAL FIX: Clone ArrayBuffer to prevent it from becoming detached by ePub.js worker
          const bookData = book.content instanceof ArrayBuffer ? book.content.slice(0) : book.content;
          
          const epub = (window as any).ePub(bookData);
          bookInstanceRef.current = epub;
          
          await new Promise(r => setTimeout(r, 100)); // Slight delay for DOM
          if (!viewerRef.current) throw new Error("Reader container not ready");
          
          // Render directly into the paper element
          const rendition = epub.renderTo(viewerRef.current, { 
            width: '100%', 
            height: '100%', 
            flow: 'paginated', 
            manager: 'default',
            allowScriptedContent: false
          });
          
          renditionRef.current = rendition;
          
          // Apply initial theme
          rendition.themes.default({
            'body': {
              'font-family': settings.fontFamily === 'serif' ? 'Merriweather, serif !important' : 'Inter, sans-serif !important',
              'font-size': `${settings.fontSize}px !important`,
              'line-height': `${settings.lineHeight} !important`,
              'color': `${themeConfig.text} !important`,
              'padding-top': '40px !important',
              'padding-bottom': '40px !important',
              'padding-left': '40px !important',
              'padding-right': '40px !important',
              'box-sizing': 'border-box !important',
            },
            'p': {
              'font-family': 'inherit !important',
              'font-size': 'inherit !important',
              'line-height': 'inherit !important',
            }
          });

          await rendition.display();
          
          if (isMounted) setEngineLoading(false);
          
          rendition.on('relocated', (location: any) => {
            const percent = location.start.percentage;
            if (isMounted) setCurrentPage({ current: Math.floor(percent * 100), total: 100, label: `${Math.floor(percent * 100)}%` });
          });

        } else if (book.format === 'pdf') {
          const pdfjsLib = (window as any).pdfjsLib;
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
          
          // CRITICAL FIX: Clone ArrayBuffer to prevent it from becoming detached
          const bookData = book.content instanceof ArrayBuffer ? book.content.slice(0) : book.content;
          
          const loadingTask = pdfjsLib.getDocument({ data: bookData });
          const doc = await loadingTask.promise;
          if (isMounted) {
            setPdfDoc(doc);
            setEngineLoading(false);
            setPageNum(1);
          }
        } else {
          // TXT/FB2/RTF
          const elements = parseContent(book.content);
          if (isMounted) {
            setParsedElements(elements);
            setEngineLoading(false);
            setCurrentPage({ current: 0, total: 100, label: '滚动阅读' });
          }
        }
      } catch (err: any) {
        console.error(err);
        if (isMounted) {
          setError(err.message || "无法加载书籍内容");
          setEngineLoading(false);
        }
      }
    };

    initReader();

    // Debounced Resize Handler to prevent ResizeObserver loop error
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = setTimeout(() => {
        if (renditionRef.current && book.format === 'epub') {
           try {
             renditionRef.current.resize();
           } catch (e) { console.warn("Resize error:", e); }
        }
        // Use current pdfDoc from state (via closure if dependent) or simply rely on re-renders
        if (book.format === 'pdf' && pdfDoc) {
           renderPdfPage(pageNumRef.current, pdfDoc);
        }
      }, 250); // Debounce time
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      if (bookInstanceRef.current) { try { bookInstanceRef.current.destroy(); } catch (e) {} }
    };
  }, [book.id]); 

  // Separate effect to handle PDF resize logic updates if pdfDoc changes
  useEffect(() => {
     const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = setTimeout(() => {
        if (renditionRef.current && book.format === 'epub') {
           try {
             renditionRef.current.resize();
           } catch (e) { console.warn("Resize error:", e); }
        }
        if (book.format === 'pdf' && pdfDoc) {
           renderPdfPage(pageNumRef.current, pdfDoc);
        }
      }, 250);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [book.format, pdfDoc]);

  // Update styles dynamically
  useEffect(() => {
    if (renditionRef.current && book.format === 'epub') {
      renditionRef.current.themes.default({
        'body': {
          'font-family': settings.fontFamily === 'serif' ? 'Merriweather, serif !important' : 'Inter, sans-serif !important',
          'font-size': `${settings.fontSize}px !important`,
          'line-height': `${settings.lineHeight} !important`,
          'color': `${themeConfig.text} !important`,
        }
      });
    }
  }, [settings, themeConfig, book.format]);

  return (
    <div className="h-full flex flex-col overflow-hidden transition-colors duration-500 relative" style={{ backgroundColor: themeConfig.bg }}>
      
      {/* Reader Navbar - Floating overlay style */}
      <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-6 z-50 transition-opacity hover:opacity-100 opacity-0 md:opacity-100 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${themeConfig.bg} 0%, transparent 100%)` }}>
        <div className="flex items-center gap-4 pointer-events-auto">
          <button 
            onClick={onBack} 
            className="p-2 rounded-full backdrop-blur-md bg-black/5 hover:bg-black/10 transition-all shadow-sm"
            title="返回书架"
          >
            <ArrowLeft size={20} style={{ color: themeConfig.text }} />
          </button>
          <h2 className="text-sm font-bold truncate max-w-[200px] md:max-w-md drop-shadow-sm" style={{ color: themeConfig.text }}>{book.title}</h2>
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
           <div className="px-3 py-1 rounded-full bg-black/5 backdrop-blur-sm text-[10px] font-bold uppercase tracking-widest" style={{ color: themeConfig.text }}>
             {currentPage.label}
           </div>
          <button 
            onClick={() => setShowSettings(!showSettings)} 
            className={`p-2 rounded-full transition-all ${showSettings ? 'bg-indigo-600 text-white' : 'bg-black/5 hover:bg-black/10'}`}
            style={{ color: showSettings ? 'white' : themeConfig.text }}
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden h-full w-full">
        {engineLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-inherit">
            <Loader2 size={40} className="animate-spin text-indigo-600 mb-4" />
            <p className="text-xs font-bold opacity-50 uppercase tracking-widest">Opening Book...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-50 bg-inherit">
            <AlertCircle size={48} className="text-red-500 mb-4 opacity-50" />
            <h3 className="text-xl font-bold mb-2">Error Loading Book</h3>
            <p className="text-gray-500 mb-6 max-w-md">{error}</p>
            <button onClick={onBack} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl shadow-lg hover:bg-indigo-700">Back to Library</button>
          </div>
        )}

        {/* Interaction Zones */}
        {!engineLoading && !error && (
          <>
            <div onClick={prevPage} className="absolute left-0 top-16 bottom-10 w-[80px] z-30 cursor-pointer hover:bg-black/5 transition-colors group/left hidden md:flex items-center justify-center">
              <ChevronLeft className="opacity-0 group-hover/left:opacity-50 transition-opacity" size={40} style={{ color: themeConfig.text }} />
            </div>
            <div onClick={nextPage} className="absolute right-0 top-16 bottom-10 w-[80px] z-30 cursor-pointer hover:bg-black/5 transition-colors group/right hidden md:flex items-center justify-center">
              <ChevronRight className="opacity-0 group-hover/right:opacity-50 transition-opacity" size={40} style={{ color: themeConfig.text }} />
            </div>
          </>
        )}

        <div className="h-full w-full flex flex-col items-center justify-center pt-16 md:pt-0 pb-4">
          
          {/* EPUB Container */}
          <div className={`w-full max-w-4xl h-full px-2 md:px-8 ${book.format === 'epub' ? 'block' : 'hidden'}`}>
             <div 
               ref={viewerRef} 
               className="w-full h-full reader-paper rounded-xl md:rounded-3xl shadow-sm md:shadow-2xl" 
               style={{ backgroundColor: themeConfig.paper }} 
             />
          </div>

          {/* PDF Container */}
          <div className={`w-full h-full overflow-y-auto overflow-x-hidden p-4 md:p-8 no-scrollbar flex justify-center ${book.format === 'pdf' ? 'block' : 'hidden'}`}>
             <div className="reader-paper bg-white rounded-lg shadow-xl self-start">
                <canvas ref={pdfCanvasRef} className="block w-full h-auto" />
             </div>
          </div>

          {/* TXT/FB2 Container */}
          {(book.format === 'fb2' || book.format === 'txt' || book.format === 'rtf') && (
            <div ref={scrollContainerRef} className="h-full w-full overflow-y-auto px-4 md:px-0 flex flex-col items-center no-scrollbar pb-20 pt-20 md:pt-16">
              <div 
                className={`max-w-3xl w-full p-8 md:p-16 rounded-xl md:rounded-3xl shadow-none md:shadow-xl min-h-full transition-all ${settings.fontFamily === 'serif' ? 'serif-font' : ''}`} 
                style={{ backgroundColor: themeConfig.paper, color: themeConfig.text }}
              >
                <header className="mb-12 border-b pb-6 opacity-40 text-center">
                  <h1 className="text-xl md:text-2xl font-bold">{book.title}</h1>
                </header>
                <div 
                  className="select-text prose max-w-none break-words" 
                  style={{ fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight }}
                >
                  {parsedElements}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute top-20 right-6 w-72 bg-white/95 backdrop-blur-2xl shadow-2xl rounded-2xl p-6 z-[60] border border-gray-100 animate-in fade-in slide-in-from-top-4">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-6">阅读设置</h4>
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-3 uppercase">主题颜色</label>
              <div className="flex gap-3">
                {(['light', 'dark', 'sepia'] as const).map(t => (
                  <button key={t} onClick={() => setSettings(s => ({...s, theme: t}))} className={`flex-1 h-10 rounded-xl border-2 transition-all ${t === 'light' ? 'bg-white border-gray-100' : t === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-[#f4ecd8] border-[#e0d5ba]'} ${settings.theme === t ? 'ring-2 ring-indigo-500 ring-offset-2 scale-105' : 'opacity-70 hover:opacity-100'}`} />
                ))}
              </div>
            </div>
            
            {book.format !== 'pdf' && (
              <>
                <div>
                  <div className="flex justify-between items-center mb-3 text-[10px] font-bold text-gray-400 uppercase">
                    <span>字体大小</span><span className="text-indigo-600 font-black">{settings.fontSize}px</span>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-xl">
                    <button onClick={() => setSettings(s => ({...s, fontSize: Math.max(12, s.fontSize - 2)}))} className="w-8 h-8 bg-white rounded-lg shadow-sm font-black text-gray-600 hover:text-indigo-600">-</button>
                    <input type="range" min="12" max="40" step="2" value={settings.fontSize} onChange={(e) => setSettings(s => ({...s, fontSize: parseInt(e.target.value)}))} className="flex-1 accent-indigo-600 h-1 bg-gray-200 rounded-full appearance-none cursor-pointer" />
                    <button onClick={() => setSettings(s => ({...s, fontSize: Math.min(48, s.fontSize + 2)}))} className="w-8 h-8 bg-white rounded-lg shadow-sm font-black text-gray-600 hover:text-indigo-600">+</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                  <button onClick={() => setSettings(s => ({...s, fontFamily: 'serif'}))} className={`py-2 rounded-lg text-xs font-bold transition-all ${settings.fontFamily === 'serif' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>Serif</button>
                  <button onClick={() => setSettings(s => ({...s, fontFamily: 'sans'}))} className={`py-2 rounded-lg text-xs font-bold transition-all ${settings.fontFamily === 'sans' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>Sans</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReaderView;
