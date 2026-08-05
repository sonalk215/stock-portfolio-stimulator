import { Inter } from 'next/font/google';
import './globals.css';
import { ApolloWrapper } from './lib/apollo-wrapper';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Stock Simulator',
  description: 'Virtual trading platform',
};

const RootLayout = ({ children }) => {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ApolloWrapper>{children}</ApolloWrapper>
        <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />
      </body>
    </html>
  );
};

export default RootLayout;
