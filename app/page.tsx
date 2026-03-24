import Link from 'next/link';
import { Printer, ArrowRight, Zap, Shield, Clock } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 relative overflow-hidden">
      <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-blue-100 blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-amber-100 blur-3xl opacity-60 pointer-events-none" />

      <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-6xl mx-auto">
        <div className="flex items-center space-x-3">
          <div className="bg-slate-900 p-2 rounded-xl">
            <Printer className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">XeroxFlow</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Log in
          </Link>
          <Link href="/signup" className="text-sm font-medium bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
            Register Shop
          </Link>
        </div>
      </nav>

      <main className="relative z-10 flex flex-col items-center pt-20 pb-16 px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center space-x-2 bg-white border border-slate-200 px-3 py-1.5 rounded-full mb-8 shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium tracking-wide text-slate-600">Simple. Fast. Reliable.</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1]">
          A clean print queue
          <br className="hidden md:block" />
          for modern Xerox shops.
        </h1>

        <p className="text-base md:text-lg text-slate-600 max-w-2xl mb-10 leading-relaxed">
          Real-time orders, instant pricing, and a smooth upload flow. Everything your shop needs to stay organized.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
          <Link href="/signup" className="group flex items-center space-x-2 w-full sm:w-auto px-7 py-3.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-all">
            <span>Get Started</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/login" className="flex items-center space-x-2 w-full sm:w-auto px-7 py-3.5 bg-white text-slate-900 border border-slate-200 rounded-xl font-medium hover:border-slate-300 hover:bg-slate-50 transition-all">
            <span>Admin Dashboard</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-4xl mx-auto text-left">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <Zap className="w-7 h-7 text-slate-900 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Instant Quotes</h3>
            <p className="text-slate-600 text-sm leading-relaxed">Auto-calculate pages and prices before customers submit.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <Clock className="w-7 h-7 text-slate-900 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Live Queue</h3>
            <p className="text-slate-600 text-sm leading-relaxed">See new orders instantly and keep the workflow moving.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <Shield className="w-7 h-7 text-slate-900 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Secure Storage</h3>
            <p className="text-slate-600 text-sm leading-relaxed">Uploads are stored safely and easy to access when needed.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
