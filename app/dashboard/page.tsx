'use client';

import { useEffect, useMemo, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc,
  addDoc,
  deleteDoc,
  setDoc,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import {
  LogOut,
  Link as LinkIcon,
  Printer,
  Trash,
  UploadCloud,
  FileText,
  CheckCircle2,
  Circle,
  Trash2,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';

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

export default function Dashboard() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [pinnedDocs, setPinnedDocs] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [uploadingPin, setUploadingPin] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [savingSettings, setSavingSettings] = useState(false);

  const settingsRef = useMemo(() => {
    if (!adminUser?.uid) return null;
    return doc(db, 'admins', adminUser.uid, 'settings', 'config');
  }, [adminUser?.uid]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAdminUser(user);

        const qOrders = query(
          collection(db, 'admins', user.uid, 'orders'),
          orderBy('createdAtMs', 'desc')
        );
        const unsubOrders = onSnapshot(
          qOrders,
          (snap) => {
            const fetched: any[] = [];
            snap.forEach((docSnap) =>
              fetched.push({ id: docSnap.id, ...docSnap.data() })
            );
            setOrders(fetched);
            setLoadingInitial(false);
          },
          (err) => {
            toast.error(err?.message || 'Failed to load orders.');
            setLoadingInitial(false);
          }
        );

        const qPinned = query(collection(db, 'admins', user.uid, 'pinned'));
        const unsubPinned = onSnapshot(
          qPinned,
          (snap) => {
            const fetchedPinned: any[] = [];
            snap.forEach((docSnap) =>
              fetchedPinned.push({ id: docSnap.id, ...docSnap.data() })
            );
            setPinnedDocs(fetchedPinned);
          },
          (err) => {
            toast.error(err?.message || 'Failed to load pinned docs.');
          }
        );

        const unsubSettings = onSnapshot(
          doc(db, 'admins', user.uid, 'settings', 'config'),
          async (snap) => {
            if (snap.exists()) {
              setSettings({ ...defaultSettings, ...(snap.data() as any) });
            } else {
              await setDoc(
                doc(db, 'admins', user.uid, 'settings', 'config'),
                defaultSettings
              );
            }
          }
        );

        return () => {
          unsubOrders();
          unsubPinned();
          unsubSettings();
        };
      } else {
        router.push('/login');
      }
    });
    return () => unsub();
  }, [router]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    if (!adminUser) return;
    try {
      await updateDoc(doc(db, 'admins', adminUser.uid, 'orders', orderId), {
        status,
      });
      if (status === 'Ready') {
        toast.success('Order marked as Ready!');
      }
    } catch (err: any) {
      toast.error('Failed to update status: ' + err.message);
    }
  };

  const copyShopLink = () => {
    if (!adminUser) return;
    navigator.clipboard.writeText(
      `${window.location.origin}/${adminUser.uid}`
    );
    toast.success('Shop link copied to clipboard!');
  };

  const handlePinUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !adminUser) return;

    setUploadingPin(true);
    const toastId = toast.loading(`Uploading ${file.name}...`);
    const filePath = `${adminUser.uid}/pinned/${Date.now()}_${file.name}`;
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) {
      toast.error('Authentication failed.', { id: toastId });
      setUploadingPin(false);
      return;
    }
    try {
      const uploadResult = await new Promise<{ publicUrl: string }>(
        (resolve, reject) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('filePath', filePath);

          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/upload');
          xhr.setRequestHeader('Authorization', `Bearer ${idToken}`);
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

      await addDoc(collection(db, 'admins', adminUser.uid, 'pinned'), {
        fileName: file.name,
        fileUrl: uploadResult.publicUrl,
        filePath,
      });
      toast.success('Document pinned successfully!', { id: toastId });
    } catch (err: any) {
      toast.error('Upload failed: ' + (err?.message || 'Unknown error'), {
        id: toastId,
      });
    }
    setUploadingPin(false);
  };

  const deriveSupabasePathFromUrl = (url?: string) => {
    if (!url) return undefined;
    const marker = '/storage/v1/object/public/xerox-files/';
    const idx = url.indexOf(marker);
    if (idx === -1) return undefined;
    return url.slice(idx + marker.length);
  };

  const deletePinnedDoc = async (id: string, filePath?: string) => {
    if (!adminUser) return;
    try {
      const resolvedPath =
        filePath ||
        deriveSupabasePathFromUrl(
          (pinnedDocs.find((docItem) => docItem.id === id) as any)?.fileUrl
        );
      if (resolvedPath) {
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) {
          toast.error('Authentication failed.');
          return;
        }
        const res = await fetch('/api/delete-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ filePath: resolvedPath }),
        });
        if (!res.ok) {
          const msg = await res.text();
          toast.warning(msg || 'File delete failed. Removing record only.');
        }
      }
      await deleteDoc(doc(db, 'admins', adminUser.uid, 'pinned', id));
      toast.success('Document deleted');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete document');
    }
  };

  const saveSettings = async () => {
    if (!settingsRef) return;
    setSavingSettings(true);
    try {
      await setDoc(settingsRef, settings, { merge: true });
      toast.success('Pricing updated');
    } catch (err: any) {
      toast.error('Failed to save settings: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePrint = (url: string) => {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
      toast.error('Pop-up blocked. Allow pop-ups to open the PDF.');
      return;
    }
    toast.message('PDF opened. Use your browser print (Ctrl+P).');
  };

  const handlePrintAndReady = async (orderId: string, fileUrl: string) => {
    handlePrint(fileUrl);
    await updateOrderStatus(orderId, 'Ready');
  };

  const deleteOrder = async (
    orderId: string,
    filePath?: string,
    fileUrl?: string
  ) => {
    if (!adminUser) return;
    try {
      const resolvedPath = filePath || deriveSupabasePathFromUrl(fileUrl);
      if (resolvedPath) {
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) {
          toast.error('Authentication failed.');
          return;
        }
        const res = await fetch('/api/delete-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ filePath: resolvedPath }),
        });
        if (!res.ok) {
          throw new Error(await res.text());
        }
      }
      await deleteDoc(doc(db, 'admins', adminUser.uid, 'orders', orderId));
      toast.success('Order deleted');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete order');
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="animate-pulse flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-slate-200 rounded-2xl"></div>
          <div className="w-32 h-4 bg-slate-200 rounded"></div>
          <div className="w-24 h-4 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans">
      <aside className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col h-screen md:sticky md:top-0 z-20">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white text-slate-900">
          <div className="flex items-center space-x-2">
            <div className="bg-slate-900 p-2 rounded-lg">
              <Printer className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">XeroxFlow</h2>
          </div>
          <button
            onClick={() => auth.signOut()}
            className="text-slate-400 hover:text-slate-900 transition-colors p-1"
            title="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-8">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              Pinned Docs
            </h3>

            <div className="space-y-3 mb-6">
              {pinnedDocs.map((docItem) => (
                <div
                  key={docItem.id}
                  className="group flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-all"
                >
                  <a
                    href={docItem.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-3 overflow-hidden text-slate-700 hover:text-slate-900"
                  >
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {docItem.fileName}
                    </span>
                  </a>
                  <button
                    onClick={() => deletePinnedDoc(docItem.id, docItem.filePath)}
                    className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {pinnedDocs.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  No pinned documents.
                </p>
              )}
            </div>

            <div className="relative group border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-slate-400 hover:bg-slate-50 transition-all cursor-pointer">
              <input
                type="file"
                accept="application/pdf"
                onChange={handlePinUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={uploadingPin}
              />
              <UploadCloud className="w-7 h-7 mx-auto text-slate-400 group-hover:text-slate-700 mb-3 transition-colors" />
              <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-800 transition-colors">
                {uploadingPin ? 'Uploading...' : 'Upload Form / Pin'}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              Pricing
            </h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 ml-1">
                  Shop Name
                </label>
                <input
                  value={settings.shopName}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, shopName: e.target.value }))
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: 'B&W Single',
                    key: 'priceBWSingle' as const,
                  },
                  {
                    label: 'B&W Double',
                    key: 'priceBWDouble' as const,
                  },
                  {
                    label: 'Color Single',
                    key: 'priceColorSingle' as const,
                  },
                  {
                    label: 'Color Double',
                    key: 'priceColorDouble' as const,
                  },
                ].map((item) => (
                  <div key={item.key} className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-500 ml-1">
                      {item.label}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={settings[item.key]}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          [item.key]: Number(e.target.value),
                        }))
                      }
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-400"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={saveSettings}
                disabled={savingSettings}
                className="w-full flex items-center justify-center space-x-2 bg-slate-900 text-white p-3 rounded-xl font-medium hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingSettings ? 'Saving...' : 'Save Pricing'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50/50">
          <button
            onClick={copyShopLink}
            className="w-full flex items-center justify-center space-x-2 bg-white border border-slate-300 text-slate-700 p-3 rounded-xl font-medium hover:bg-slate-50 hover:text-slate-900 transition-all"
          >
            <LinkIcon className="w-4 h-4" />
            <span>Copy Shop Link</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <header className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">
                Live Queue
              </h1>
              <p className="text-slate-500 font-medium text-sm">
                Real-time incoming print requests
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>Receiving updates</span>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-5">
            {orders.map((order) => {
              const statusColors = {
                Pending: 'bg-amber-100 text-amber-700 border-amber-200',
                Printing: 'bg-blue-100 text-blue-700 border-blue-200',
                Ready: 'bg-emerald-100 text-emerald-700 border-emerald-200',
              } as Record<string, string>;

              return (
                <div
                  key={order.id}
                  className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 transition-all flex flex-col lg:flex-row gap-6"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-bold text-slate-900">
                        {order.customerName || 'Guest Customer'}
                      </h3>
                      <span
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider border ${statusColors[order.status] || 'bg-slate-100 text-slate-700'}`}
                      >
                        {order.status}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        #{order.id.slice(-6)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-md max-w-xs overflow-hidden">
                        <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-700 truncate">
                          {order.fileName}
                        </span>
                      </div>
                      <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                        {order.pageCount} Pages
                      </span>
                      <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-1 rounded-md">
                        {order.copies} Copies
                      </span>
                      <span className="text-xs font-semibold bg-purple-50 text-purple-700 px-2 py-1 rounded-md">
                        {order.isColor ? 'Color' : 'B&W'}
                      </span>
                      <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                        {order.isDoubleSided ? 'Double Sided' : 'Single Sided'}
                      </span>
                    </div>

                    <div className="text-2xl font-black text-slate-900 tracking-tight">
                      Rs {Number(order.totalPrice || 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-500 mt-2">
                      {order.billablePages ?? order.pageCount} pages x{' '}
                      {order.copies ?? 1} copies x Rs{' '}
                      {Number(order.pricePerPage || 0).toFixed(2)}/page
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 lg:justify-end border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
                    <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
                      {['Pending', 'Printing', 'Ready'].map((status) => {
                        const isCurrent = order.status === status;
                        return (
                          <button
                            key={status}
                            onClick={() => updateOrderStatus(order.id, status)}
                            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                              isCurrent
                                ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-slate-900'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                            }`}
                          >
                            {isCurrent && status === 'Ready' && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            )}
                            {isCurrent && status === 'Printing' && (
                              <Circle className="w-3.5 h-3.5 text-blue-500 animate-pulse fill-blue-500/20" />
                            )}
                            <span>{status}</span>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() =>
                        handlePrintAndReady(order.id, order.fileUrl)
                      }
                      className="flex items-center justify-center space-x-2 bg-slate-900 text-white px-6 py-2.5 w-full sm:w-auto rounded-xl font-medium hover:bg-slate-800 transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print & Ready</span>
                    </button>
                    <button
                      onClick={() =>
                        deleteOrder(order.id, order.filePath, order.fileUrl)
                      }
                      className="flex items-center justify-center space-x-2 bg-white text-slate-900 border border-slate-200 px-5 py-2.5 w-full sm:w-auto rounded-xl font-medium hover:border-slate-300 hover:bg-slate-50 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {orders.length === 0 && !loadingInitial && (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm">
                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <Printer className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Queue is fully clear
                </h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                  New print orders will appear here instantly when customers
                  upload them.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

