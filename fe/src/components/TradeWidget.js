'use client';

import { useState } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';

const GET_QUOTE = gql`
  query GetQuote($symbol: String!) {
    quote(symbol: $symbol) {
      symbol
      currentPrice
    }
  }
`;

const BUY_STOCK = gql`
  mutation BuyStock($symbol: String!, $shares: Int!) {
    buyStock(symbol: $symbol, shares: $shares) {
      id
    }
  }
`;

const SELL_STOCK = gql`
  mutation SellStock($symbol: String!, $shares: Int!) {
    sellStock(symbol: $symbol, shares: $shares) {
      id
    }
  }
`;

const TradeWidget = () => {
  const [symbolInput, setSymbolInput] = useState('');
  const [sharesInput, setSharesInput] = useState(1);
  const [message, setMessage] = useState({ text: '', type: '' });

  // useLazyQuery gives us a trigger function to run the query manually!
  const [
    getQuote,
    { data: quoteData, loading: quoteLoading, error: quoteError },
  ] = useLazyQuery(GET_QUOTE);

  const [buyStock, { loading: buyLoading }] = useMutation(BUY_STOCK, {
    refetchQueries: ['GetDashboardData'], // Refetch the dashboard data after buying stock
  });

  const [sellStock, { loading: sellLoading }] = useMutation(SELL_STOCK, {
    refetchQueries: ['GetDashboardData'], // Refetch the dashboard data after buying stock
  });

  const handleSearch = (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    if (!symbolInput.trim()) return;
    getQuote({ variables: { symbol: symbolInput.trim() } });
  };

  const executeTrade = async (type) => {
    setMessage({ text: '', type: '' });

    try {
      const variables = {
        symbol: quoteData.quote.symbol,
        shares: parseInt(sharesInput),
      };

      if (type === 'BUY') {
        await buyStock({ variables });
        setMessage({
          text: `Successfully bought ${variables.shares} shares of ${variables.symbol}!`,
          type: 'success',
        });
      } else {
        await sellStock({ variables });
        setMessage({
          text: `Successfully sold ${variables.shares} shares of ${variables.symbol}!`,
          type: 'success',
        });
      }
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  return (
    <div className="rounded-2xl bg-slate-800 p-6 shadow-xl border border-slate-700">
      <h2 className="mb-4 text-xl font-semibold">Trade Terminal</h2>

      {/* SEARCH BAR */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          type="text"
          value={symbolInput}
          onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
          placeholder="Enter Symbol (e.g. AAPL)"
          className="w-full rounded-lg border border-slate-600 bg-slate-700 p-3 text-white placeholder-slate-400 focus:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-400 uppercase"
          required
        />
        <button
          type="submit"
          disabled={quoteLoading}
          className="rounded-lg bg-blue-500 px-6 font-semibold text-white transition-colors hover:bg-blue-400 disabled:opacity-50"
        >
          {quoteLoading ? '...' : 'Search'}
        </button>
      </form>

      {/* ERROR / SUCCESS MESSAGES */}
      {quoteError && (
        <p className="mb-4 text-red-400 text-sm">
          Failed to fetch quote. Check symbol.
        </p>
      )}
      {message.text && (
        <div
          className={`mb-4 rounded p-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-500/10 text-green-400 border border-green-500/50'
              : 'bg-red-500/10 text-red-400 border border-red-500/50'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* TRADE ACTIONS (Only show if we have a valid quote) */}
      {quoteData?.quote && (
        <div className="rounded-lg bg-slate-900/50 p-4 border border-slate-700/50">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-2xl font-bold">{quoteData.quote.symbol}</span>
            <span className="text-2xl text-green-400">
              ${quoteData.quote.currentPrice.toFixed(2)}
            </span>
          </div>

          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Shares
              </label>
              <input
                type="number"
                min="1"
                value={sharesInput}
                onChange={(e) => setSharesInput(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-700 p-3 text-white focus:border-green-400 focus:outline-none"
              />
            </div>

            <button
              onClick={() => executeTrade('BUY')}
              disabled={buyLoading || sellLoading}
              className="rounded-lg bg-green-500 px-6 py-3 font-semibold text-slate-900 hover:bg-green-400 disabled:opacity-50"
            >
              Buy
            </button>
            <button
              onClick={() => executeTrade('SELL')}
              disabled={buyLoading || sellLoading}
              className="rounded-lg bg-red-500 px-6 py-3 font-semibold text-slate-900 hover:bg-red-400 disabled:opacity-50"
            >
              Sell
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeWidget;
