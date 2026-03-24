'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import {
  Timestamp,
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { PDFDocument } from 'pdf-lib';
import { UploadCloud, FileText, CheckCircle, Loader2 } from 'lucide-react';

type Settings = {
  shopName: string;
  priceBWSingle: number;
  priceBWDouble: number;
  priceColorSingle: number;
  priceColorDouble: number;
};

const defaultSettings: Settings = {
  shopName: 'Print Shop',
  priceBWSingle: 2,
  priceBWDouble: 3,
  priceColorSingle: 10,
  priceColorDouble: 15,
};

export default function CustomerUpload({
  params,
}: {
  params: Promise<{ adminId: string }>;
}) {
  const { adminId } = use(params);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [isColor, setIsColor] = useState(false);
  const [isDoubleSided, setIsDoubleSided] = useState(false);
  const [copies, setCopies] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [authReady, setAuthReady] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState('Pending');

  useEffect(() => {
    const ensureAuth = async () => {
      if (auth.currentUser) {
        setAuthReady(true);
        return;
      }
      try {
        await signInAnonymously(auth);
        setAuthReady(true);
      } catch (err: any) {
        setError(err.message || 'Authentication failed.');
        setAuthReady(false);
      }
    };
    ensureAuth();
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      const docRef = doc(db, 'admins', adminId, 'settings', 'config');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings({ ...defaultSettings, ...(docSnap.data() as any) });
      }
    };
    fetchSettings();
  }, [adminId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    setError('');
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      const arrayBuffer = await selected.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      setPageCount(pdfDoc.getPageCount());
    } else {
      setFile(null);
      setPageCount(0);
      setError('Please upload a valid PDF file.');
    }
  };

  const billablePages = useMemo(() => {
    return isDoubleSided ? Math.ceil(pageCount / 2) : pageCount;
  }, [isDoubleSided, pageCount]);

  const pricePerPage = useMemo(() => {
    if (isColor && isDoubleSided) return settings.priceColorDouble;
    if (isColor) return settings.priceColorSingle;
    if (isDoubleSided) return settings.priceBWDouble;
    return settings.priceBWSingle;
  }, [isColor, isDoubleSided, settings]);

  const totalPrice = billablePages * copies * pricePerPage;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError('');

    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
        setAuthReady(true);
      } catch (err: any) {
        setError(err.message || 'Authentication failed.');
        setUploading(false);
        return;
      }
    }

    const ordersRef = collection(db, 'admins', adminId, 'orders');
    const orderRef = doc(ordersRef);
    const orderId = orderRef.id;

    const filePath = `${adminId}/${orderId}.pdf`;
    setProgress(5);
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) {
      setError('Authentication failed.');
      setUploading(false);
      return;
    }
    const customerUid = auth.currentUser?.uid;

    const uploadResult = await new Promise<{ publicUrl: string }>(
      (resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('filePath', filePath);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload');
        xhr.setRequestHeader('Authorization', `Bearer ${idToken}`);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            setProgress(Math.min(95, Math.max(10, pct)));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve({ publicUrl: data.publicUrl });
            } catch {
              reject(new Error('Upload response invalid.'));
            }
          } else {
            reject(new Error(xhr.responseText || 'Upload failed.'));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed.'));
        xhr.send(formData);
      }
    );

    const downloadURL = uploadResult.publicUrl;

    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + 12 * 60 * 60 * 1000)
    );

    await setDoc(orderRef, {
      adminId,
      customerUid,
      customerName: customerName.trim() || 'Guest',
      fileName: file.name,
      fileUrl: downloadURL,
      filePath,
      pageCount,
      billablePages,
      isColor,
      isDoubleSided,
      copies,
      pricePerPage,
      totalPrice,
      status: 'Pending',
      createdAt: serverTimestamp(),
      createdAtMs: Date.now(),
      expiresAt,
    });

    setProgress(100);
    setOrderId(orderId);
    setOrderStatus('Pending');
    setUploading(false);
    setSuccess(true);
  };

  useEffect(() => {
    if (!orderId) return;
    const orderRef = doc(db, 'admins', adminId, 'orders', orderId);
    const unsub = onSnapshot(
      orderRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as any;
          if (data?.status) setOrderStatus(data.status);
        }
      },
      (err) => {
        setError(err?.message || 'Unable to read order status.');
      }
    );
    return () => unsub();
  }, [adminId, orderId]);

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900">
        <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full text-center space-y-4 border border-slate-200">
          <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto" />
          <h2 className="text-2xl font-bold tracking-tight">Order Sent</h2>
          <p className="text-slate-500">
            Status:{' '}
            <span className="font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
              {orderStatus}
            </span>
          </p>
          <div className="pt-4">
            <button
              onClick={() => window.location.reload()}
              className="text-sm font-medium text-slate-900 hover:text-slate-700 hover:underline"
            >
              Send another document
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-900 font-sans">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-200 bg-white">
          <h1 className="text-2xl font-bold tracking-tight">
            {settings.shopName}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Upload your document to print
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 ml-1">
              Customer Name (optional)
            </label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-400"
              placeholder="Your name"
            />
          </div>

          <div className="relative">
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={uploading}
            />
            <div
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
                file
                  ? 'border-slate-400 bg-slate-50'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {file ? (
                <div className="flex flex-col items-center space-y-2 text-slate-900">
                  <FileText className="w-10 h-10 text-slate-700" />
                  <p className="font-medium truncate max-w-[200px] sm:max-w-xs">
                    {file.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {pageCount} pages detected
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-3 text-slate-500">
                  <div className="p-3 bg-slate-100 rounded-full">
                    <UploadCloud className="w-8 h-8 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">
                      Tap to upload PDF
                    </p>
                    <p className="text-xs mt-1">Maximum size 50MB</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {error ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl">
              {error}
            </div>
          ) : null}

          <div
            className={`space-y-6 transition-opacity duration-300 ${
              file ? 'opacity-100' : 'opacity-40 pointer-events-none'
            }`}
          >
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center space-x-3 p-4 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={isColor}
                  onChange={(e) => setIsColor(e.target.checked)}
                  className="w-5 h-5 rounded text-slate-900 focus:ring-slate-900"
                />
                <span className="font-medium">Color Print</span>
              </label>
              <label className="flex items-center space-x-3 p-4 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={isDoubleSided}
                  onChange={(e) => setIsDoubleSided(e.target.checked)}
                  className="w-5 h-5 rounded text-slate-900 focus:ring-slate-900"
                />
                <span className="font-medium">Double-sided</span>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-xl">
              <span className="font-medium">Number of Copies</span>
              <div className="flex items-center space-x-4 bg-slate-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setCopies(Math.max(1, copies - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-md bg-white shadow-sm hover:text-slate-900 transition-colors"
                >
                  -
                </button>
                <span className="w-8 text-center font-medium">{copies}</span>
                <button
                  type="button"
                  onClick={() => setCopies(copies + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-md bg-white shadow-sm hover:text-slate-900 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div
            className={`pt-6 border-t border-slate-200 flex items-center justify-between transition-opacity duration-300 ${
              file ? 'opacity-100' : 'opacity-40'
            }`}
          >
            <div>
              <p className="text-sm text-slate-500 mb-1">
                Total Estimated Price
              </p>
              <p className="text-3xl font-bold tracking-tight text-slate-900">
                Rs {totalPrice.toFixed(2)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {billablePages} billable pages x {copies} copies x Rs{' '}
                {pricePerPage}/page
              </p>
            </div>
            <button
              type="submit"
              disabled={!file || uploading || !authReady}
              className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <span>Send to Print</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
