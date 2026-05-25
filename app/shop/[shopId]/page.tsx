'use client';
import { useState, use, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function ShopDropBoxPage({ params }: { params: Promise<{ shopId: string }> }) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [printType, setPrintType] = useState('bw');
  const [shopInfo, setShopInfo] = useState<any>(null);
  const [totalCost, setTotalCost] = useState(0);

  const [uploading, setUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const resolvedParams = use(params);

  useEffect(() => {
    // Log the user in anonymously if they aren't already, so they bypass upload RLS
    const initAnonAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInAnonymously();
      }
    };
    initAnonAuth();

    const fetchShopInfo = async () => {
      const { data } = await supabase.from('shops').select('*').eq('id', resolvedParams.shopId).single();
      if (data) setShopInfo(data);
    };
    fetchShopInfo();
  }, [resolvedParams.shopId]);

  useEffect(() => {
    if (shopInfo) {
      let price = 0;
      if (printType === 'bw') price = shopInfo.pricing_bw || 0;
      else if (printType === 'bw_double') price = shopInfo.pricing_bw_double || 0;
      else if (printType === 'color') price = shopInfo.pricing_color || 0;
      else if (printType === 'color_double') price = shopInfo.pricing_color_double || 0;
      
      setTotalCost(price * quantity);
    }
  }, [quantity, printType, shopInfo]);

  const handleUpload = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (!file || !name || !phone) return;

    setUploading(true);
    setErrorMsg('');
    
    try {
      // 1. Clean the filename to store it safely in the path without a separate column
      const safeOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${Date.now()}_${safeOriginalName}`;
      const filePath = `${resolvedParams.shopId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('xerox-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Fetch the anonymous user ID to link to the order
      const { data: { user } } = await supabase.auth.getUser();

      // 3. Add to orders table exactly matching your existing schema
      const { error: dbError } = await supabase
        .from('orders')
        .insert({
          shop_id: resolvedParams.shopId,
          customer_id: user?.id,
          file_path: filePath,
          quantity: quantity,
          color_mode: printType,
          status: 'pending',
          customer_name: name,
          customer_phone: phone,
          total_cost: totalCost
        });

      if (dbError) throw dbError;

      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  if (isSuccess) {
    const upiLink = shopInfo?.upi_id 
      ? `upi://pay?pa=${shopInfo.upi_id}&pn=${encodeURIComponent(shopInfo.store_name || 'Print Shop')}&am=${totalCost.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Print Order for ${name}`)}`
      : '';

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2 text-center">Sent Successfully!</h1>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 max-w-sm w-full text-center">
          <p className="text-slate-500 text-sm mb-2">Total Amount</p>
          <p className="text-4xl font-black text-slate-900 mb-4">₹{totalCost.toFixed(2)}</p>
          <p className="text-slate-600 text-sm mb-6">
            Please show your name (<strong>{name}</strong>) to the shop owner after you receive your prints to collect.
          </p>
          
          {upiLink && totalCost > 0 && (
            <a 
              href={upiLink}
              className="flex items-center justify-center space-x-2 w-full bg-emerald-600 text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-emerald-700 transition"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              <span>Pay ₹{totalCost.toFixed(2)} via UPI</span>
            </a>
          )}
        </div>
        <button 
          onClick={() => { setIsSuccess(false); setFile(null); }}
          className="bg-slate-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-slate-800"
        >
          Send Another Document
        </button>
      </div>
    );
  }

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

        <form onSubmit={handleUpload} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 w-full flex flex-col space-y-5">
          
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                required
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone Number"
                required
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Copies/Pages</label>
                <input 
                  type="number" 
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  required
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Print Type</label>
                <select 
                  value={printType}
                  onChange={(e) => setPrintType(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
                >
                  <option value="bw">B&W (Single)</option>
                  <option value="bw_double">B&W (Double)</option>
                  <option value="color">Color (Single)</option>
                  <option value="color_double">Color (Double)</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative cursor-pointer mt-2">
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
            disabled={!file || uploading || !name || !phone}
            className="w-full bg-slate-900 text-white font-medium py-3.5 rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex justify-between items-center px-6 mt-2"
          >
            <span>{uploading ? 'Sending...' : 'Send to Printer Queue'}</span>
            {!uploading && (
              <span className="bg-white/20 px-3 py-1 rounded-lg text-sm font-bold">
                ₹{totalCost.toFixed(2)}
              </span>
            )}
          </button>
        </form>
        
        <p className="text-xs text-slate-400 mt-8 text-center px-4">
          Documents are encrypted and automatically deleted after printing to protect your privacy.
        </p>
      </main>
    </div>
  );
}
