// src/graphql/typeDefs.js
const typeDefs = `#graphql
  enum TradeType {
    BUY
    SELL
  }

  type Transaction {
    id: ID!
    symbol: String!
    type: TradeType!
    shares: Int!
    price: Float!
    createdAt: String!
  }

  type Holding {
    id: ID!
    symbol: String!
    shares: Int!
    updatedAt: String!
  }

  type User {
    id: ID!
    email: String!
    balance: Float!
    createdAt: String!

    holdings: [Holding!]!
    transactions: [Transaction!]!
  }

  type StockQuote {
    symbol: String!
    currentPrice: Float!
  }

  type Query {
    me: User
    status: String!
    quote(symbol: String!): StockQuote
  }

  type Mutation {
    register(email: String!, password: String!): User!
    login(email: String!, password: String!): User!
    logout: Boolean!

    # Buy stock mutation
    buyStock(symbol: String!, shares: Int!): Transaction!

    # Sell stock mutation
    sellStock(symbol: String!, shares: Int!): Transaction!
  }
`;

module.exports = { typeDefs };
