'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';

import TradeWidget from '@/components/TradeWidget';
import LiveTicker from '@/components/LiveTicker';

// --- GRAPHQL QUERIES & MUTATIONS ---
const GET_DASHBOARD_DATA = gql`
  query GetDashboardData {
    me {
      id
      email
      balance
      holdings {
        id
        symbol
        shares
        updatedAt
      }
      transactions {
        id
        symbol
        type
        price
        shares
        createdAt
      }
    }
  }
`;
const GET_STATUS = gql`
  query GetStatus {
    status
  }
`;

const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

const Dashboard = () => {
  const router = useRouter();
  const { data, loading, error, client } = useQuery(GET_DASHBOARD_DATA);
  const [logout] = useMutation(LOGOUT_MUTATION);

  useEffect(() => {
    if (!loading && !data?.me) {
      router.push('/auth');
    }
  }, [loading, data, router]);

  const handleLogout = async () => {
    await logout();
    await client.resetStore(); // Clear Apollo Client cache
    router.push('/auth');
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('en-us', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-us', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading || !data?.me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <p className="animate-pulse text-xl text-green-400">
          Loading your portfolio...
        </p>
      </div>
    );
  }

  const { email, balance, holdings, transactions } = data.me;

  return (
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex items-center justify-between border-b border-slate-700 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Portfolio Dashboard
            </h1>
            <p className="text-slate-400">Logged in as {email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-700 hover:text-white"
          >
            Sign Out
          </button>
        </header>

        <LiveTicker />

        {/* CASH BALANCE CARD */}
        <div className="mb-10 rounded-2xl bg-slate-800 p-8 shadow-xl border border-slate-700">
          <h2 className="text-sm font-medium uppercase tracking-wider text-slate-400 mb-2">
            Available Cash
          </h2>
          <p className="text-5xl font-bold text-green-400">
            {formatMoney(balance)}
          </p>
        </div>

        <div className="mb-8">
          <TradeWidget />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* HOLDINGS SECTION */}
          <section className="rounded-2xl bg-slate-800 p-6 shadow-xl border border-slate-700">
            <h2 className="mb-6 text-xl font-semibold">Your Assets</h2>
            {holdings.length === 0 ? (
              <p className="text-slate-400 text-sm">
                You do not own any stocks yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-700 text-slate-400">
                    <tr>
                      <th className="pb-3 font-medium">Symbol</th>
                      <th className="pb-3 font-medium text-right">
                        Total Shares
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {holdings.map((holding) => (
                      <tr
                        key={holding.id}
                        className="transition-colors hover:bg-slate-700/30"
                      >
                        <td className="py-4 font-bold text-white">
                          {holding.symbol}
                        </td>
                        <td className="py-4 text-right text-slate-300">
                          {holding.shares}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* TRANSACTIONS SECTION */}
          <section className="rounded-2xl bg-slate-800 p-6 shadow-xl border border-slate-700">
            <h2 className="mb-6 text-xl font-semibold">Recent Activity</h2>
            {transactions.length === 0 ? (
              <p className="text-slate-400 text-sm">
                No transaction history found.
              </p>
            ) : (
              <div className="overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                <div className="space-y-4">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-lg bg-slate-900/50 p-4 border border-slate-700/50"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2 py-1 rounded ${
                              tx.type === 'BUY'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {tx.type}
                          </span>
                          <span className="font-bold">{tx.symbol}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(tx.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {tx.shares} shares @ {formatMoney(tx.price)}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Total: {formatMoney(tx.shares * tx.price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default Dashboard;
