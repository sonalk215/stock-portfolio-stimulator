'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// Connect to your Express backend (adjust port if yours is different)
// NOTE: Use NEXT_PUBLIC_BACKEND_URL to connect to the backend
const SOCKET_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function LiveTicker() {
  const [prices, setPrices] = useState({});

  useEffect(() => {
    // 1. Establish WebSocket connection to backend
    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      console.log('🟢 Connected to Market Data Engine');
    });

    // 2. Listen for the 'priceUpdate' event emitted by our Redis Subscriber
    socket.on('priceUpdate', (data) => {
      setPrices((prevPrices) => ({
        ...prevPrices,
        [data.symbol]: data.price,
      }));
    });

    // 3. Cleanup connection when component unmounts
    return () => {
      socket.disconnect();
    };
  }, []);

  // Don't render anything if we haven't received any prices yet
  if (Object.keys(prices).length === 0) return null;

  return (
    <div className="mb-6 flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
      <div className="flex items-center gap-2 mr-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Live Market
        </span>
      </div>

      {Object.entries(prices).map(([symbol, price]) => (
        <div
          key={symbol}
          className="flex-shrink-0 rounded-lg bg-slate-900/50 px-4 py-2 border border-slate-700/50 shadow-sm flex items-center gap-3"
        >
          <span className="font-bold text-slate-300">{symbol}</span>
          <span className="font-mono text-green-400">
            ${Number(price).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}
