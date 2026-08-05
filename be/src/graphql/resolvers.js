const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { prisma, JWT_SECRET } = require('../db.js');

// --- NEW: Finnhub API Helper ---
const fetchLivePrice = async (symbol) => {
  const uppercaseSymbol = symbol.toUpperCase();
  const apiKey = process.env.FINNHUB_API_KEY;

  const response = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${uppercaseSymbol}&token=${apiKey}`
  );
  const data = await response.json();

  if (!data.c || data.c === 0) {
    throw new Error(`Invalid stock symbol: ${uppercaseSymbol}`);
  }

  return data.c;
};

// Helper to generate JWT and attach HTTP-only cookie
const setAuthCookie = (res, userId) => {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, {
    httpOnly: true, // Shields against XSS attacks
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
};

const resolvers = {
  Query: {
    status: () => 'API is running smoothly!',
    me: async (_, __, context) => {
      if (!context.userId) return null;

      const user = await prisma.user.findUnique({
        where: { id: context.userId },
      });

      if (!user) return null;

      return {
        ...user,
        createdAt: user.createdAt.toISOString(),
      };
    },
    quote: async (_, { symbol }) => {
      const livePrice = await fetchLivePrice(symbol);
      return {
        symbol: symbol.toUpperCase(),
        currentPrice: livePrice,
      };
    },
  },

  User: {
    holdings: async (parent) => {
      const holdings = await prisma.holding.findMany({
        where: { userId: parent.id },
      });
      return holdings.map((h) => ({
        ...h,
        updatedAt: h.updatedAt.toISOString(),
      }));
    },
    transactions: async (parent) => {
      const txs = await prisma.transaction.findMany({
        where: { userId: parent.id },
        orderBy: { createdAt: 'desc' },
      });
      return txs.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
      }));
    },
  },

  Mutation: {
    register: async (_, { email, password }, context) => {
      // 1. Check if user already exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new Error('Email is already registered');
      }
      // 2. Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      // 3. Create user in PostgreSQL
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
        },
      });

      // 4. Set authentication cookie
      setAuthCookie(context.res, user.id);

      return {
        ...user,
        createdAt: user.createdAt.toISOString(),
      };
    },

    login: async (_, { email, password }, context) => {
      const user = await prisma.user.findUnique({ where: { email } });
      console.log('----------user =', user);
      if (!user || !user.passwordHash) {
        throw new Error('Invalid email or password');
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      console.log('----------isValid =', isValid);
      if (!isValid) {
        throw new Error('Invalid email or password');
      }

      // 3. Set authentication cookie
      setAuthCookie(context.res, user.id);

      return {
        ...user,
        createdAt: user.createdAt.toISOString(),
      };
    },

    logout: (_, __, context) => {
      context.res.clearCookie('token');
      return true;
    },

    buyStock: async (_, { symbol, shares }, context) => {
      if (!context.userId) throw new Error('You must be logged in to trade');
      if (shares <= 0) throw new Error('Shares must be greater than zero');

      const livePrice = await fetchLivePrice(symbol);
      const totalCost = shares * livePrice;
      const uppercaseSymbol = symbol.toUpperCase();

      const user = await prisma.user.findUnique({
        where: { id: context.userId },
      });
      if (user.balance < totalCost) {
        throw new Error(
          `Insufficient funds. You need $${totalCost} but have $${user.balance}`
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: context.userId },
          data: { balance: { decrement: totalCost } },
        });

        const transaction = await tx.transaction.create({
          data: {
            userId: context.userId,
            symbol: uppercaseSymbol,
            type: 'BUY',
            shares,
            price: livePrice,
          },
        });

        await tx.holding.upsert({
          where: {
            userId_symbol: { userId: context.userId, symbol: uppercaseSymbol },
          },
          update: { shares: { increment: shares } },
          create: {
            userId: context.userId,
            symbol: uppercaseSymbol,
            shares,
          },
        });

        return transaction;
      });
      return {
        ...result,
        createdAt: result.createdAt.toISOString(),
      };
    },

    sellStock: async (_, { symbol, shares }, context) => {
      if (!context.userId) throw new Error('You must be logged in to trade');
      if (shares <= 0) throw new Error('Shares must be greater than zero');

      const livePrice = await fetchLivePrice(symbol);
      const uppercaseSymbol = symbol.toUpperCase();
      const totalRevenue = shares * livePrice;

      const holding = await prisma.holding.findUnique({
        where: {
          userId_symbol: { userId: context.userId, symbol: uppercaseSymbol },
        },
      });

      if (!holding || holding.shares < shares) {
        throw new Error(
          `Insufficient shares. You only own ${
            holding?.shares || 0
          } shares of ${uppercaseSymbol}.`
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: context.userId },
          data: { balance: { increment: totalRevenue } },
        });

        const transaction = await tx.transaction.create({
          data: {
            userId: context.userId,
            symbol: uppercaseSymbol,
            type: 'SELL',
            shares,
            price: livePrice,
          },
        });

        if (holding.shares === shares) {
          await tx.holding.delete({
            where: {
              userId_symbol: {
                userId: context.userId,
                symbol: uppercaseSymbol,
              },
            },
          });
        } else {
          await tx.holding.update({
            where: {
              userId_symbol: {
                userId: context.userId,
                symbol: uppercaseSymbol,
              },
            },
            data: { shares: { decrement: shares } },
          });
        }
        return transaction;
      });

      return {
        ...result,
        createdAt: result.createdAt.toISOString(),
      };
    },
  },
};

module.exports = { resolvers };
