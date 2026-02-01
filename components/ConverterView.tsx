
import React, { useState } from 'react';
import { Book, BookFormat } from '../types';
import { ArrowRight, Download, CheckCircle2, Loader2, FileText, RefreshCw } from 'lucide-react';

interface ConverterViewProps {
  books: Book[];
}

const ConverterView: React.FC<ConverterViewProps> = ({ books }) => {
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [targetFormat, setTargetFormat] = useState<BookFormat>('txt');
  const [isConverting, setIsConverting] = useState(false);
  const [result, setResult] = useState<{ url: string; name: string } | null>(null);

  const formats: BookFormat[] = ['epub', 'pdf', 'mobi', 'txt', 'rtf'];

  const handleConvert = () => {
    if (!selectedBookId) return;
    setIsConverting(true);
    setResult(null);

    // 核心转换逻辑模拟：对于 TXT，我们可以直接从 content 提取
    setTimeout(() => {
      const book = books.find(b => b.id === selectedBookId);
      if (!book) return;

      let blob: Blob;
      if (typeof book.content === 'string') {
        blob = new Blob([book.content], { type: 'text/plain' });
      } else {
        // 如果是二进制，模拟转换
        blob = new Blob([book.content as ArrayBuffer], { type: 'application/octet-stream' });
      }

      const downloadUrl = URL.createObjectURL(blob);
      setIsConverting(false);
      setResult({
        url: downloadUrl,
        name: `${book.title}.${targetFormat}`
      });
    }, 2000);
  };

  return (
    <div className="max-w-5xl mx-auto p-12 h-full flex flex-col">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h3 className="text-4xl font-black text-gray-900 mb-2">Omni-Converter</h3>
          <p className="text-gray-500 font-medium">Cross-compile your library into compatible reading formats.</p>
        </div>
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
           <RefreshCw size={32} className={isConverting ? "animate-spin" : ""} />
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50">
             <label className="block text-[10px] font-black text-indigo-600 mb-4 uppercase tracking-[0.2em]">Step 1: Select Source Book</label>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {books.length === 0 ? (
                  <div className="col-span-2 py-12 text-center border-2 border-dashed border-gray-100 rounded-2xl text-gray-400">
                    Your library is empty. Add some books first!
                  </div>
                ) : (
                  books.map(book => (
                    <button
                      key={book.id}
                      onClick={() => setSelectedBookId(book.id)}
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                        selectedBookId === book.id 
                        ? 'border-indigo-600 bg-indigo-50' 
                        : 'border-gray-50 bg-gray-50 hover:border-gray-200 hover:bg-white'
                      }`}
                    >
                      <img src={book.cover} className="w-12 h-16 object-cover rounded-lg shadow-sm" />
                      <div className="text-left">
                        <div className="text-sm font-bold truncate w-32">{book.title}</div>
                        <div className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">{book.format}</div>
                      </div>
                    </button>
                  ))
                )}
             </div>
           </div>

           <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50">
             <label className="block text-[10px] font-black text-indigo-600 mb-4 uppercase tracking-[0.2em]">Step 2: Destination Format</label>
             <div className="flex flex-wrap gap-3">
               {formats.map(f => (
                 <button
                    key={f}
                    onClick={() => setTargetFormat(f)}
                    className={`px-6 py-3 rounded-xl font-bold transition-all border-2 ${
                      targetFormat === f 
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg' 
                      : 'border-gray-100 text-gray-400 hover:border-indigo-200'
                    }`}
                 >
                   {f.toUpperCase()}
                 </button>
               ))}
             </div>
           </div>
        </div>

        <div className="bg-indigo-900 rounded-3xl p-8 text-white flex flex-col justify-between overflow-hidden relative">
          <div className="relative z-10">
            <h4 className="text-2xl font-bold mb-4">Processing Hub</h4>
            <p className="text-indigo-200 text-sm leading-relaxed mb-8">
              Our edge-computing engine extracts structural metadata, reflows content, and compiles it for the target device.
            </p>
            
            {result ? (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 animate-in zoom-in-95 duration-500">
                <div className="flex items-center gap-3 text-green-400 font-bold mb-4">
                  <CheckCircle2 size={24} />
                  Ready to go!
                </div>
                <div className="text-sm text-indigo-100 truncate mb-6">{result.name}</div>
                <a 
                  href={result.url} 
                  download={result.name}
                  className="w-full bg-white text-indigo-900 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors shadow-xl"
                >
                  <Download size={20} />
                  Download File
                </a>
                <button onClick={() => setResult(null)} className="w-full mt-4 text-xs font-bold text-indigo-300 hover:text-white transition-colors">Convert Another</button>
              </div>
            ) : (
              <button
                disabled={!selectedBookId || isConverting}
                onClick={handleConvert}
                className={`w-full py-6 rounded-2xl font-black text-lg shadow-2xl transition-all flex items-center justify-center gap-4 ${
                  !selectedBookId || isConverting 
                  ? 'bg-indigo-800 text-indigo-400 cursor-not-allowed' 
                  : 'bg-indigo-500 hover:bg-indigo-400 text-white active:scale-95'
                }`}
              >
                {isConverting ? <Loader2 className="animate-spin" /> : "START CONVERSION"}
              </button>
            )}
          </div>
          
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        </div>
      </div>
    </div>
  );
};

export default ConverterView;
