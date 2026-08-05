require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken'); // Added JWT
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@as-integrations/express5');

// Import your actual schema, resolvers, and secrets
const { JWT_SECRET } = require('./src/db.js');
const { typeDefs } = require('./src/graphql/typeDefs.js');
const { resolvers } = require('./src/graphql/resolvers.js');

const startServer = async () => {
  const app = express();

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://stock-portfolio-stimulator.vercel.app', // Production Frontend
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
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
    credentials: true, // Required for HTTP-only cookies
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
  app.options('*', cors(corsOptions)); // Handle preflight requests explicitly

  app.use(express.json());
  app.use(cookieParser());

  // Initialize Apollo with your imported schema and resolvers
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();

  // Mount Apollo to Express and build the GraphQL Context
  app.use(
    '/graphql',
    expressMiddleware(server, {
      // The context function runs on every incoming GraphQL request
      context: async ({ req, res }) => {
        let userId = null;

        // Extract the token cookie parsed by cookie-parser
        const token = req.cookies?.token;

        if (token) {
          try {
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.userId;
          } catch (err) {
            console.error('Invalid or expired token');
          }
        }

        // Pass req, res, and userId to the resolvers
        return { req, res, userId };
      },
    })
  );

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
  });
};

startServer().catch((err) => {
  console.error('Error starting server:', err);
});
