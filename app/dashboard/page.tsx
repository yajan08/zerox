'use client';
import { useEffect, useState } from 'react';
export default function DashboardPage() {
  const [orders, setOrders] = useState([]);
  useEffect(() => {}, []);
  return (
    <div className="flex flex-col items-center min-h-screen py-10">
      <h1 className="text-4xl font-bold mb-8">Shop Dashboard</h1>
      <div className="w-full max-w-4xl"><p>No orders yet.</p></div>
    </div>
  );
}