require('dotenv').config();
const express = require('express');
const { createServer } = require('http'); // Required for Socket.io
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@as-integrations/express5');
const { Server } = require('socket.io'); // Import Socket.io
const Redis = require('ioredis'); // Import ioredis
const WebSocket = require('ws'); // Import standard ws for Finnhub

// Import your actual schema, resolvers, and secrets
const { JWT_SECRET } = require('./src/db.js');
const { typeDefs } = require('./src/graphql/typeDefs.js');
const { resolvers } = require('./src/graphql/resolvers.js');

const startServer = async () => {
  const app = express();
  // Create an HTTP server so we can attach both Express and Socket.io to it
  const httpServer = createServer(app);

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://stock-portfolio-stimulator.vercel.app', // Production Frontend
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  const corsOptions = {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        process.env.NODE_ENV !== 'production'
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Apollo-Require-Preflight',
    ],
  };

  // Middleware
  app.set('trust proxy', 1);
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(cookieParser());

  // --- 1. SETUP SOCKET.IO (Frontend Connection) ---
  const io = new Server(httpServer, {
    cors: corsOptions,
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Frontend client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`🔌 Frontend client disconnected: ${socket.id}`);
    });
  });

  // --- 2. SETUP REDIS (Pub/Sub) ---
  // We need two separate connections: one for publishing, one for subscribing
  const redisUrl = process.env.REDIS_URL;
  const redisPub = new Redis(redisUrl);
  const redisSub = new Redis(redisUrl);

  const PRICE_CHANNEL = 'LIVE_PRICES';

  // --- 3. THE SUBSCRIBER: Listen to Redis and broadcast to Frontend ---
  redisSub.subscribe(PRICE_CHANNEL, (err, count) => {
    if (err) console.error('Failed to subscribe to Redis channel:', err);
    else console.log(`📡 Subscribed to ${count} Redis channel(s).`);
  });

  redisSub.on('message', (channel, message) => {
    if (channel === PRICE_CHANNEL) {
      const priceData = JSON.parse(message);
      // Broadcast the price data to all connected React clients!
      io.emit('priceUpdate', priceData);
    }
  });

  // --- 4. THE INGESTOR: Connect to Finnhub and publish to Redis ---
  const startFinnhubIngestor = () => {
    const finnhubKey = process.env.FINNHUB_API_KEY;
    if (!finnhubKey) {
      console.warn('⚠️ FINNHUB_API_KEY is missing. Real-time data disabled.');
      return;
    }

    const ws = new WebSocket(`wss://ws.finnhub.io?token=${finnhubKey}`);

    ws.on('open', () => {
      console.log('📈 Connected to Finnhub WebSocket');
      // Subscribe to some default symbols to get the data flowing
      const symbolsToTrack = [
        'BINANCE:BTCUSDT',
        'AAPL',
        'MSFT',
        'TSLA',
        'AMZN',
        'NVDA',
      ];
      symbolsToTrack.forEach((symbol) => {
        ws.send(JSON.stringify({ type: 'subscribe', symbol }));
      });
    });

    ws.on('message', (data) => {
      const response = JSON.parse(data);
      // Finnhub sends pings or trade arrays. We only care about trades ('trade')
      if (response.type === 'trade' && response.data) {
        // The data array contains individual trade objects.
        // Example: { p: 150.25, s: 'AAPL', t: 1629812938, v: 100 } (price, symbol, timestamp, volume)
        // We will grab the latest trade for each message.
        const latestTrade = response.data[response.data.length - 1];

        const pricePayload = {
          symbol: latestTrade.s,
          price: latestTrade.p,
          timestamp: latestTrade.t,
        };

        // Publish the cleaned-up data to Redis
        redisPub.publish(PRICE_CHANNEL, JSON.stringify(pricePayload));
      }
    });

    ws.on('error', (err) => console.error('Finnhub WS Error:', err));
    ws.on('close', () => {
      console.log('📉 Finnhub WebSocket closed. Reconnecting in 5s...');
      setTimeout(startFinnhubIngestor, 5000);
    });
  };

  startFinnhubIngestor();

  // Initialize Apollo with your imported schema and resolvers
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();

  // Mount Apollo to Express and build the GraphQL Context
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req, res }) => {
        let userId = null;
        const token = req.cookies?.token;

        if (token) {
          try {
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.userId;
          } catch (err) {
            console.error('Invalid or expired token');
          }
        }
        return { req, res, userId };
      },
    })
  );

  const PORT = process.env.PORT || 4000;
  // CRITICAL: We must listen on the `httpServer`, not the raw `app`
  // so that both Express and Socket.io share the same port.
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
  });
};

startServer().catch((err) => {
  console.error('Error starting server:', err);
});
