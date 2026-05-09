'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import QRCode from 'react-qr-code';

export default function ProfilePage() {
  const [shopName, setShopName] = useState('');
  const [pricingBw, setPricingBw] = useState('2.00');
  const [pricingColor, setPricingColor] = useState('10.00');
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [origin, setOrigin] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }

    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUserId(session.user.id);
      
      const { data: shopData } = await supabase
        .from('shops')
        .select('store_name, pricing_bw, pricing_color')
        .eq('id', session.user.id)
        .single();
        
      if (shopData) {
        setShopName(shopData.store_name);
        if (shopData.pricing_bw !== null) setPricingBw(shopData.pricing_bw.toString());
        if (shopData.pricing_color !== null) setPricingColor(shopData.pricing_color.toString());
      }
    };
    
    loadProfile();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    if (!userId) return;

    const { error } = await supabase
      .from('shops')
      .update({ 
        store_name: shopName,
        pricing_bw: parseFloat(pricingBw),
        pricing_color: parseFloat(pricingColor)
      })
      .eq('id', userId);

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Profile updated successfully!');
    }
    setSaving(false);
  };

  const handlePrintQR = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 print:bg-white print:min-h-0">
      
      {/* Hide the nav entirely when printing */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center print:hidden">
        <div className="font-bold text-xl">Shop Profile</div>
        <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          ← Back to Queue
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto p-6 mt-8 flex flex-col md:flex-row gap-8 print:p-0 print:mt-0 print:block">
        
        {/* Left Col: Settings Form - Hidden entirely when printing */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm print:hidden">
          <h2 className="text-2xl font-bold mb-6">Shop Settings</h2>
          
          <form onSubmit={handleSave} className="space-y-6">
            {message && (
              <div className={`p-4 rounded-xl text-sm ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                {message}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Shop Name</label>
              <input 
                type="text" 
                value={shopName} 
                onChange={(e) => setShopName(e.target.value)} 
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none text-slate-900" 
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">B&W Print (₹)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={pricingBw} 
                  onChange={(e) => setPricingBw(e.target.value)} 
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none text-slate-900" 
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Color Print (₹)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={pricingColor} 
                  onChange={(e) => setPricingColor(e.target.value)} 
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none text-slate-900" 
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={saving}
              className="w-full bg-slate-900 text-white font-medium p-3 rounded-xl hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </form>
        </div>

        {/* Right Col: QR Code - This is the ONLY thing shown when printing */}
        <div className="w-full md:w-80 flex flex-col items-center print:w-full print:block print:absolute print:top-0 print:left-0 print:h-screen print:flex print:flex-col print:items-center print:justify-center">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm w-full flex flex-col items-center print:border-none print:shadow-none print:p-0">
            
            {/* Massive heading only visible on the printed paper */}
            <h1 className="text-5xl font-extrabold mb-12 text-center text-slate-900 hidden print:block tracking-tight">
              {shopName || 'Your Shop'}
            </h1>
            
            <h3 className="text-lg font-bold mb-2 text-center print:hidden">{shopName || 'Your Shop'}</h3>
            <p className="text-xs text-slate-500 mb-6 text-center print:hidden">Scan to upload print documents</p>
            
            {/* The QR Container */}
            <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-sm mb-6 print:border-none print:shadow-none print:p-0 print:mb-12 print:scale-150">
              {userId && origin ? (
                <QRCode 
                  value={`${origin}/shop/${userId}`}
                  size={200}
                  level="H"
                />
              ) : (
                <div className="w-[200px] h-[200px] bg-slate-100 flex items-center justify-center text-slate-400 text-sm rounded-lg">
                  Loading QR...
                </div>
              )}
            </div>

            {/* Subtext only visible on the printed paper */}
            <p className="text-3xl text-slate-800 font-bold text-center hidden print:block mt-8">
              Scan to Print 🖨️
            </p>
            <p className="text-xl text-slate-500 mt-4 text-center hidden print:block">
              Send your PDFs securely to our queue
            </p>

            <button 
              onClick={handlePrintQR}
              className="mt-2 text-sm font-medium bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors print:hidden"
            >
              🖨️ Print QR Poster
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}
