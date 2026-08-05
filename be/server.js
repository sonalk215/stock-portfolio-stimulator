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

  // Middleware
  app.set('trust proxy', 1);
  app.use(cors({ origin: 'http://localhost:3001', credentials: true }));
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
