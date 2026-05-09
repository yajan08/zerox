'use client';
import { useState, use } from 'react';
import { UploadCloud, FileText } from 'lucide-react';

export default function ShopDropBoxPage({ params }: { params: Promise<{ shopId: string }> }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const resolvedParams = use(params);

  const handleUpload = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    setUploading(true);
    // TODO: Upload logic goes here next!
    setTimeout(() => setUploading(false), 1000); 
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col items-center py-10 px-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-blue-100 blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-amber-100 blur-3xl opacity-60 pointer-events-none" />

      <main className="relative z-10 w-full max-w-md flex flex-col items-center mt-10">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 inline-flex items-center justify-center">
          <UploadCloud className="w-8 h-8 text-slate-900" />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-center">Print Drop-Box</h1>
        <p className="text-slate-500 text-center mb-8 text-sm">
          Securely upload your document to this shop's print queue.
        </p>

        <form onSubmit={handleUpload} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 w-full flex flex-col space-y-6">
          
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative cursor-pointer">
            <input 
              type="file" 
              onChange={(e) => setFile(e.target.files?.[0] || null)} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".pdf"
              required
            />
            <FileText className={`w-10 h-10 mb-3 ${file ? 'text-emerald-500' : 'text-slate-400'}`} />
            {file ? (
              <div className="flex flex-col items-center">
                <span className="text-sm font-medium text-slate-900 bg-slate-100 px-3 py-1 rounded-full overflow-hidden text-ellipsis max-w-[200px] whitespace-nowrap">
                  {file.name}
                </span>
                <span className="text-xs text-slate-500 mt-2">Ready to send</span>
              </div>
            ) : (
              <>
                <span className="text-sm font-semibold text-slate-700">Tap to select a PDF</span>
                <span className="text-xs text-slate-400 mt-1">Maximum size: 25MB</span>
              </>
            )}
          </div>

          <button 
            type="submit" 
            disabled={!file || uploading}
            className="w-full bg-slate-900 text-white font-medium py-3.5 rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'Sending to Queue...' : 'Send to Printer Queue'}
          </button>
        </form>
        
        <p className="text-xs text-slate-400 mt-8 text-center px-4">
          Documents are encrypted and automatically deleted after printing to protect your privacy.
        </p>
      </main>
    </div>
  );
}
