'use client';

import { useState } from 'react';
import { gql } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { useMutation, useApolloClient } from '@apollo/client/react';

// --- GRAPHQL MUTATIONS ---
const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      id
      email
    }
  }
`;

const REGISTER_MUTATION = gql`
  mutation Register($email: String!, $password: String!) {
    register(email: $email, password: $password) {
      id
      email
    }
  }
`;

const AuthPage = () => {
  const router = useRouter();
  const client = useApolloClient();
  const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [customError, setCustomError] = useState('');

  const [login, { loading: loginLoading }] = useMutation(LOGIN_MUTATION);
  const [register, { loading: registerLoading }] =
    useMutation(REGISTER_MUTATION);

  const loading = loginLoading || registerLoading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCustomError('');

    try {
      if (isLogin) {
        console.log('coming ehre');
        await login({ variables: { email, password } });
      } else {
        await register({ variables: { email, password } });
      }

      await client.clearStore();
      router.push('/');
    } catch (err) {
      setCustomError(err.message || 'An error occurred. Please try again.');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4 text-white">
      <div className="w-full max-w-md rounded-xl bg-slate-800 p-8 shadow-2xl">
        <h1 className="mb-6 text-center text-3xl font-bold tracking-tight text-green-400">
          {isLogin ? 'Welcome Back' : 'Start Trading'}
        </h1>

        {customError && (
          <div className="mb-4 rounded bg-red-500/10 p-3 border border-red-500/50 text-sm text-red-400">
            {customError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-700 p-3 text-white placeholder-slate-400 focus:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-400"
              placeholder="investor@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-700 p-3 text-white placeholder-slate-400 focus:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-400"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-green-500 p-3 font-semibold text-slate-900 transition-colors hover:bg-green-400 disabled:opacity-50"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setCustomError('');
            }}
            className="font-medium text-green-400 hover:underline focus:outline-none"
          >
            {isLogin ? 'Register here' : 'Sign in here'}
          </button>
        </div>
      </div>
    </main>
  );
};

export default AuthPage;
