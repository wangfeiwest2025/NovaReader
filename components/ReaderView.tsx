
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Book, ReadingSettings } from '../types';
import { ChevronLeft, ChevronRight, Settings, ArrowLeft, Loader2, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { parseMobi } from '../utils/mobiParser';

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
  
  // Text Pagination State
  const [textPage, setTextPage] = useState(0);
  const [textTotalPages, setTextTotalPages] = useState(1);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const [columnWidth, setColumnWidth] = useState<number>(0);

  const [error, setError] = useState<string | null>(null);
  
  // PDF state
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const pageNumRef = useRef(1); 

  const renditionRef = useRef<any>(null);
  const bookInstanceRef = useRef<any>(null);
  const viewerRef = useRef<HTMLDivElement>(null); 
  const resizeTimeoutRef = useRef<any>(null);

  useEffect(() => {
    pageNumRef.current = pageNum;
  }, [pageNum]);

  const themeConfig = {
    dark: { bg: '#121212', text: '#d1d5db', paper: '#1e1e1e', border: '#333' },
    sepia: { bg: '#f4ecd8', text: '#5b4636', paper: '#fbf7ed', border: '#e0d5ba' },
    light: { bg: '#f3f4f6', text: '#111827', paper: '#ffffff', border: '#e5e7eb' }
  }[settings.theme];

  // Initialize Text Reader Page
  useEffect(() => {
     if (['txt', 'fb2', 'rtf', 'mobi', 'azw3'].includes(book.format)) {
        setTextPage(0);
        setEngineLoading(true);
     }
  }, [book.id, book.format]);

  const prevPage = useCallback(() => {
    if (book.format === 'epub' && renditionRef.current) {
      renditionRef.current.prev();
    } else if (book.format === 'pdf' && pdfDoc) {
      setPageNum(prev => Math.max(1, prev - 1));
    } else if (['txt', 'fb2', 'rtf', 'mobi', 'azw3'].includes(book.format)) {
       setTextPage(prev => Math.max(0, prev - 1));
    }
  }, [book.format, pdfDoc]);

  const nextPage = useCallback(() => {
    if (book.format === 'epub' && renditionRef.current) {
      renditionRef.current.next();
    } else if (book.format === 'pdf' && pdfDoc) {
      setPageNum(prev => Math.min(pdfDoc.numPages, prev + 1));
    } else if (['txt', 'fb2', 'rtf', 'mobi', 'azw3'].includes(book.format)) {
       setTextPage(prev => Math.min(textTotalPages - 1, prev + 1));
    }
  }, [book.format, pdfDoc, textTotalPages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevPage();
      if (e.key === 'ArrowRight' || e.key === ' ') nextPage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevPage, nextPage]);

  // Sync Text Scroll with Page
  useEffect(() => {
    if (['txt', 'fb2', 'rtf', 'mobi', 'azw3'].includes(book.format) && textContainerRef.current) {
       const gap = 40;
       const width = textContainerRef.current.clientWidth;
       textContainerRef.current.scrollTo({
         left: textPage * (width + gap),
         behavior: 'smooth'
       });
       
       setCurrentPage({
           current: textPage + 1,
           total: textTotalPages,
           label: `${textPage + 1} / ${textTotalPages}`
       });
    }
  }, [textPage, textTotalPages, book.format]);

  // Calculate Text Pages (Debounced)
  useEffect(() => {
    if (!['txt', 'fb2', 'rtf', 'mobi', 'azw3'].includes(book.format)) return;
    if (!textContainerRef.current) return;

    const calc = () => {
        if (!textContainerRef.current) return;
        const gap = 40;
        const clientW = textContainerRef.current.clientWidth;
        const scrollW = textContainerRef.current.scrollWidth;
        
        // Update column width state
        setColumnWidth(clientW);
        
        const total = Math.max(1, Math.ceil(scrollW / (clientW + gap)));
        
        if (total !== textTotalPages) {
           setTextTotalPages(total);
           if (textPage >= total) setTextPage(total - 1);
        }
    };

    // Initial calculation
    const timer = setTimeout(calc, 200);

    // Use requestAnimationFrame to prevent "ResizeObserver loop completed with undelivered notifications"
    const observer = new ResizeObserver(() => {
        window.requestAnimationFrame(() => {
            calc();
        });
    });

    observer.observe(textContainerRef.current);
    
    return () => {
        clearTimeout(timer);
        observer.disconnect();
    };
  }, [book.format, parsedElements, settings.fontSize, settings.lineHeight]);


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
      const targetWidth = Math.min(containerWidth - 40, 1000); 
      const scale = targetWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale: scale * 1.5 }); 

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

  // RTF Parsing
  const parseRTF = (rtf: string): string => {
    let text = rtf.replace(/(\{[^{}]*\})/g, "");
    text = text.replace(/\\par[d]?\s*/g, "\n");
    text = text.replace(/\\line\s*/g, "\n");
    text = text.replace(/\\[a-z0-9]+\s?/g, "");
    text = text.replace(/[{}]/g, "");
    return text.trim();
  };

  // Content Parsing (Handles raw text, FB2 XML, RTF, and basic HTML from MOBI/AZW3)
  const parseContent = (content: string) => {
    const text = content;
    const elements: React.ReactNode[] = [];

    // Helper to parse simple HTML content (often found in MOBI/AZW3)
    const parseHtmlContent = (html: string) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const processNode = (node: Node, keyPrefix: string) => {
          if (node.nodeType === 3) { // Text node
              const val = node.textContent?.trim();
              if(val) return <span key={keyPrefix}>{val} </span>;
              return null;
          }
          if (node.nodeType === 1) { // Element
              const el = node as Element;
              const tagName = el.tagName.toLowerCase();
              
              if (['img', 'script', 'style', 'head', 'meta'].includes(tagName)) return null;
              
              const children: React.ReactNode[] = [];
              el.childNodes.forEach((child, i) => {
                  const res = processNode(child, `${keyPrefix}-${i}`);
                  if (res) children.push(res);
              });

              if (children.length === 0 && !['br', 'hr'].includes(tagName)) return null;

              // Map HTML tags to basic styled elements
              switch(tagName) {
                  case 'h1': 
                  case 'h2':
                  case 'h3':
                      return <h2 key={keyPrefix} className="text-2xl font-bold my-6 border-b pb-2 break-after-avoid">{children}</h2>;
                  case 'h4':
                  case 'h5':
                      return <h3 key={keyPrefix} className="text-xl font-bold my-4">{children}</h3>;
                  case 'p':
                  case 'div':
                      return <p key={keyPrefix} className="mb-4 indent-8 leading-relaxed text-justify break-words">{children}</p>;
                  case 'b':
                  case 'strong':
                      return <strong key={keyPrefix}>{children}</strong>;
                  case 'i':
                  case 'em':
                      return <em key={keyPrefix}>{children}</em>;
                  case 'br':
                      return <br key={keyPrefix} />;
                  case 'hr':
                      return <hr key={keyPrefix} className="my-8 border-gray-300" />;
                  default:
                      return <span key={keyPrefix}>{children}</span>;
              }
          }
          return null;
      };

      doc.body.childNodes.forEach((node, i) => {
          const el = processNode(node, `azw-node-${i}`);
          if (el) elements.push(el);
      });
      
      if (elements.length === 0) {
          // Fallback if parsing failed to produce block elements
          doc.body.textContent?.split('\n').forEach((line, i) => {
             if (line.trim()) elements.push(<p key={i} className="mb-4 indent-8">{line}</p>);
          });
      }
    };

    if (book.format === 'fb2') {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        let body = xmlDoc.getElementsByTagName("body")[0] || xmlDoc.getElementsByTagName("FictionBook")[0];
        
        if (!body && text.includes("<?xml")) {
             const stripped = text.replace(/<[^>]+>/g, '\n');
             return stripped.split('\n').filter(l => l.trim()).map((l, i) => (
                <p key={i} className="mb-4 indent-8 leading-relaxed text-justify break-words">{l.trim()}</p>
             ));
        }

        if (body) {
           const processNode = (node: Node, keyPrefix: string) => {
            if (node.nodeType === 1) {
              const el = node as Element;
              if (el.tagName.match(/title/i)) {
                 elements.push(<h2 key={keyPrefix} className="text-2xl font-bold text-center my-8 border-b pb-4 w-full block">{el.textContent}</h2>);
              } else if (el.tagName.match(/p/i)) {
                 elements.push(<p key={keyPrefix} className="mb-4 indent-8 text-justify leading-relaxed">{el.textContent}</p>);
              } else if (el.tagName.match(/section/i)) {
                 node.childNodes.forEach((child, i) => processNode(child, `${keyPrefix}-${i}`));
              } else {
                 node.childNodes.forEach((child, i) => processNode(child, `${keyPrefix}-${i}`));
              }
            } 
          };
          body.childNodes.forEach((node, i) => processNode(node, `node-${i}`));
        } else {
          elements.push(<p key="err">FB2 结构解析失败，尝试以纯文本显示。</p>);
          text.split('\n').forEach((l, i) => {
             if(l.trim()) elements.push(<p key={`fb2-txt-${i}`} className="mb-4 indent-8">{l.trim()}</p>);
          });
        }
      } catch (e) {
        elements.push(<p key="err">FB2 解析错误。</p>);
      }
    } else if (book.format === 'rtf') {
      const cleanText = parseRTF(text);
      cleanText.split(/\r?\n/).forEach((l, i) => {
        const line = l.trim();
        if (line) elements.push(<p key={i} className="mb-4 indent-8 leading-relaxed text-justify break-words">{line}</p>);
      });
    } else if (book.format === 'mobi' || book.format === 'azw3') {
       // MOBI/AZW3 content is usually HTML
       parseHtmlContent(text);
    } else {
      // Plain TXT
      text.split(/\r?\n/).forEach((l, i) => {
        const line = l.trim();
        if (line) {
           elements.push(<p key={i} className="mb-4 min-h-[1em] indent-8 leading-relaxed text-justify break-words">{line}</p>);
        } else if (i % 5 === 0) { 
           elements.push(<br key={i} />);
        }
      });
    }
    return elements;
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
          
          const bookData = book.content instanceof ArrayBuffer ? book.content.slice(0) : book.content;
          const epub = (window as any).ePub(bookData);
          bookInstanceRef.current = epub;
          
          await new Promise(r => setTimeout(r, 100));
          if (!viewerRef.current) throw new Error("Reader container not ready");
          
          const rendition = epub.renderTo(viewerRef.current, { 
            width: '100%', 
            height: '100%', 
            flow: 'paginated', 
            manager: 'default',
            allowScriptedContent: false
          });
          
          renditionRef.current = rendition;
          await rendition.display();
          
          if (isMounted) setEngineLoading(false);
          
          // --- Robust EPUB Progress Logic ---

          const updateProgress = (loc: any) => {
             if (!loc || !loc.start) return;
             
             let percent = 0;
             let label = "";

             // Priority 1: Accurate Percentage (needs locations generated)
             if (epub.locations.length() > 0) {
                 const cfi = loc.start.cfi;
                 const calculated = epub.locations.percentageFromCfi(cfi);
                 if (typeof calculated === 'number') {
                     percent = calculated;
                     label = `${Math.round(percent * 100)}%`;
                 }
             }

             // Priority 2: Fallback to Native Percentage
             if (!label && typeof loc.start.percentage === 'number') {
                  percent = loc.start.percentage;
                  label = `${Math.round(percent * 100)}%`;
             }

             // Priority 3: Fallback to Chapter Index
             if (!label) {
                 const currentChapter = loc.start.index || 0;
                 const totalChapters = epub.spine.items.length || 1;
                 percent = currentChapter / totalChapters;
                 label = `${Math.round(percent * 100)}%`; 
             }

             setCurrentPage({ 
                 current: Math.floor(percent * 100), 
                 total: 100, 
                 label: label || '0%'
             });
          };

          // Handle page turns
          rendition.on('relocated', (location: any) => {
             if (isMounted) updateProgress(location);
          });

          // Generate locations
          epub.ready.then(() => {
             return epub.locations.generate(1000); 
          }).then(() => {
             if (isMounted && renditionRef.current) {
                 const currentLoc = renditionRef.current.currentLocation();
                 updateProgress(currentLoc);
             }
          }).catch((err: any) => console.warn("Location generation warning:", err));

        } else if (book.format === 'pdf') {
          const pdfjsLib = (window as any).pdfjsLib;
          // FIX: Use jsdelivr for worker to match the script tag and ensure accessibility
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js';
          
          const bookData = book.content instanceof ArrayBuffer ? book.content.slice(0) : book.content;
          const loadingTask = pdfjsLib.getDocument({ data: bookData });
          const doc = await loadingTask.promise;
          if (isMounted) {
            setPdfDoc(doc);
            setEngineLoading(false);
            setPageNum(1);
          }
        } else if (book.format === 'mobi' || book.format === 'azw3') {
           // Parse MOBI/AZW3 binary
           const buffer = book.content instanceof ArrayBuffer 
               ? book.content 
               : new TextEncoder().encode(book.content).buffer;
           
           // Works for AZW3 because AZW3 is also PDB format and parseMobi handles PDB structure
           const text = await parseMobi(buffer);
           
           if (!isMounted) return;
           const elements = parseContent(text);
           setParsedElements(elements);
           setEngineLoading(false);

        } else {
          // TXT/FB2/RTF
          setTimeout(() => {
            if (!isMounted) return;
            const elements = parseContent(typeof book.content === 'string' ? book.content : new TextDecoder().decode(book.content));
            setParsedElements(elements);
            setEngineLoading(false);
          }, 100);
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

    const handleResize = () => {
       if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
       resizeTimeoutRef.current = setTimeout(() => {
          if (renditionRef.current && book.format === 'epub') try { renditionRef.current.resize(); } catch(e){}
          if (book.format === 'pdf' && pdfDoc) renderPdfPage(pageNumRef.current, pdfDoc);
       }, 250);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      if (bookInstanceRef.current) { try { bookInstanceRef.current.destroy(); } catch (e) {} }
    };
  }, [book.id]); 

  // ... Update styles effect (kept same) ...
  useEffect(() => {
    if (renditionRef.current && book.format === 'epub') {
      renditionRef.current.themes.default({
        'body': {
          'font-family': settings.fontFamily === 'serif' ? 'Merriweather, serif !important' : 'Inter, sans-serif !important',
          'font-size': `${settings.fontSize}px !important`,
          'line-height': `${settings.lineHeight} !important`,
          'color': `${themeConfig.text} !important`,
          'padding-top': '30px !important',
          'padding-bottom': '20px !important',
          'padding-left': '20px !important',
          'padding-right': '20px !important',
          'box-sizing': 'border-box !important',
        },
        'p': {
          'font-family': 'inherit !important',
          'font-size': 'inherit !important',
          'line-height': 'inherit !important',
          'margin-bottom': '1em !important',
        },
        'img': { 'max-width': '100% !important', 'height': 'auto !important' }
      });
    }
  }, [settings, themeConfig, book.format]);

  return (
    <div className="h-full flex flex-col overflow-hidden transition-colors duration-500 relative" style={{ backgroundColor: themeConfig.bg }}>
      
      {/* Navbar - Fixed Visibility */}
      <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-4 md:px-6 z-50 opacity-100 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${themeConfig.bg} 0%, transparent 100%)` }}>
        <div className="flex items-center gap-4 pointer-events-auto">
          <button 
            onClick={onBack} 
            className="p-2 rounded-full backdrop-blur-md bg-black/5 hover:bg-black/10 transition-all shadow-sm"
            title="返回书架"
          >
            <ArrowLeft size={20} style={{ color: themeConfig.text }} />
          </button>
          <h2 className="text-sm font-bold truncate max-w-[150px] md:max-w-md drop-shadow-sm" style={{ color: themeConfig.text }}>{book.title}</h2>
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
           {/* Pagination Badge - Always Visible */}
           {!engineLoading && (
             <div className="px-3 py-1 rounded-full bg-black/5 backdrop-blur-sm text-[10px] font-bold uppercase tracking-widest" style={{ color: themeConfig.text }}>
               {currentPage.label}
             </div>
           )}
          <button 
            onClick={() => setShowSettings(!showSettings)} 
            className={`p-2 rounded-full transition-all ${showSettings ? 'bg-indigo-600 text-white' : 'bg-black/5 hover:bg-black/10'}`}
            style={{ color: showSettings ? 'white' : themeConfig.text }}
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
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

        {/* Interaction Zones (Universal) */}
        {!engineLoading && !error && (
          <>
            <div onClick={prevPage} className="absolute left-0 top-16 bottom-10 w-[15%] md:w-[80px] z-30 cursor-pointer hover:bg-black/5 transition-colors group/left flex items-center justify-center">
              <ChevronLeft className="opacity-0 group-hover/left:opacity-50 transition-opacity hidden md:block" size={40} style={{ color: themeConfig.text }} />
            </div>
            <div onClick={nextPage} className="absolute right-0 top-16 bottom-10 w-[15%] md:w-[80px] z-30 cursor-pointer hover:bg-black/5 transition-colors group/right flex items-center justify-center">
              <ChevronRight className="opacity-0 group-hover/right:opacity-50 transition-opacity hidden md:block" size={40} style={{ color: themeConfig.text }} />
            </div>
          </>
        )}

        <div className="h-full w-full flex flex-col items-center justify-center pt-0 pb-4">
          
          {/* EPUB Container */}
          <div className={`w-full max-w-5xl h-full px-0 sm:px-4 md:px-8 transition-all ${book.format === 'epub' ? 'flex justify-center' : 'hidden'}`}>
             <div 
               ref={viewerRef} 
               className="w-full h-full reader-paper rounded-none sm:rounded-2xl shadow-sm md:shadow-2xl overflow-hidden" 
               style={{ backgroundColor: themeConfig.paper }} 
             />
          </div>

          {/* PDF Container */}
          <div className={`w-full h-full overflow-y-auto overflow-x-hidden p-0 md:p-8 no-scrollbar flex justify-center ${book.format === 'pdf' ? 'block' : 'hidden'}`}>
             <div className="reader-paper bg-white rounded-none md:rounded-lg shadow-none md:shadow-xl self-start w-full md:w-auto">
                <canvas ref={pdfCanvasRef} className="block w-full h-auto" />
             </div>
          </div>

          {/* TXT/FB2/RTF/MOBI/AZW3 Container (Paged Columns) */}
          {['fb2', 'txt', 'rtf', 'mobi', 'azw3'].includes(book.format) && !engineLoading && (
            <div className="w-full h-full px-8 md:px-20 py-12 md:py-16 overflow-hidden">
                <div 
                  ref={textContainerRef}
                  className="w-full h-full overflow-x-hidden overflow-y-hidden"
                  style={{
                    color: themeConfig.text,
                  }}
                >
                  <div 
                     style={{
                       columnCount: 'auto',
                       columnWidth: `${columnWidth > 0 ? columnWidth : 'auto'}px`,
                       columnGap: '40px',
                       columnFill: 'auto',
                       height: '100%',
                       width: '100%',
                       fontSize: `${settings.fontSize}px`, 
                       lineHeight: settings.lineHeight,
                       fontFamily: settings.fontFamily === 'serif' ? 'Merriweather, serif' : 'Inter, sans-serif'
                     }}
                     className="prose max-w-none"
                  >
                     {parsedElements}
                  </div>
                </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal (Unchanged) */}
      {showSettings && (
        <div className="absolute top-16 right-4 md:right-6 w-72 bg-white/95 backdrop-blur-2xl shadow-2xl rounded-2xl p-6 z-[60] border border-gray-100 animate-in fade-in slide-in-from-top-4">
           {/* ... settings content ... */}
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
