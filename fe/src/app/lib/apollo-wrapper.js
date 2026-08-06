'use client';

import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';

// Initialize Apollo Client
const client = new ApolloClient({
  link: new HttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_URL,
    credentials: 'include', // CRITICAL: This tells the browser to send your JWT cookie!
  }),
  cache: new InMemoryCache(),
});

export function ApolloWrapper({ children }) {
  console.log('111111111111', process.env.NEXT_PUBLIC_GRAPHQL_URL);
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
