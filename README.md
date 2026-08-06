# 📈 Stock Portfolio Simulator

A real-time, full-stack stock market simulation platform built to model modern trading mechanics without financial risk.

This application demonstrates a production-ready architecture using a Next.js frontend, an Express/GraphQL backend, and a high-performance Market Data Engine powered by WebSockets and Redis Pub/Sub.

## 🚀 Key Features

  - Real-Time Market Data: Live price updates streamed directly to the frontend via Socket.io, powered by the Finnhub API and a Redis Pub/Sub backend pipeline.
  - Virtual Trading Terminal: Execute simulated "Buy" and "Sell" orders with instant portfolio balance updates and transaction logging.
  - Portfolio Dashboard: Track available cash, current asset holdings, and recent trading activity in a sleek, dark-themed UI.
  - Secure Authentication: Custom JWT-based authentication system with HTTP-only cookies for robust security against XSS attacks.
  - Modern State Management: Leveraging Apollo Client for declarative GraphQL data fetching, caching, and state synchronization.

## 🛠️ Tech Stack

  ### Frontend (Client)
  1. Framework: Next.js (App Router)
  2. Library: React
  3. State / Data Fetching: Apollo Client
  4. Real-time Connection: Socket.io-client
  5. Styling: Tailwind CSS
  6. Notifications: React Hot Toast

  ### Backend (Server)
  1. Runtime: Node.js
  2. Framework: Express.js
  3. API Layer: Apollo Server (GraphQL)
  4. Database: PostgreSQL
  5. ORM: Prisma
  6. Real-time Engine: Socket.io, ws (Finnhub connection)
  7. Message Broker / Cache: Upstash Redis (ioredis)
  8. Authentication: JWT, bcrypt

  ### External APIs
  1.  Live Market Data: Finnhub WebSocket API


## ⚙️ Architecture: The Market Data Engine

One of the core technical achievements of this project is the real-time price distribution system, designed to handle high throughput without hitting third-party API rate limits.
  1. **The Ingestor**: The Node.js server maintains a single WebSocket connection to Finnhub, listening for live trades on tracked symbols (e.g., AAPL, MSFT, BTC).
  2. **The Publisher**: Upon receiving a trade, the backend publishes the cleaned price data to a Redis channel (LIVE_PRICES).
  3. **The Broadcaster**: A separate Redis subscriber listens to this channel and emits the data via Socket.io.
  4. **TThe Client**: The Next.js LiveTicker component listens to the Socket.io event and updates the UI instantly, completely independent of the GraphQL request cycle.

This decoupled Pub/Sub architecture allows the backend to scale horizontally; multiple Node.js instances can listen to the same Redis instance and broadcast to their respective connected clients.

## 💻 Getting Started (Local Development)

  ### Prerequisites

  - Node.js (v18+)
  - PostgreSQL (Local instance or cloud provider like Neon)
  - Redis (Local instance or cloud provider like Upstash)
  - Finnhub API Key (Free tier)


  ### 1. Clone the repository
  ```
  https://github.com/sonalk215/stock-portfolio-stimulator.git
  cd stock-portfolio-simulator
  ```

  ### 2. Backend Setup
  ```
  cd be
  npm install
  ```
  #### Create a .env file in the backend directory:
  ```
  PORT=4000
  DATABASE_URL="postgresql://user:password@localhost:5432/stocksim"
  JWT_SECRET="your_super_secret_jwt_string"
  FINNHUB_API_KEY="your_finnhub_key"
  REDIS_URL="rediss://default:password@your-upstash-url.upstash.io:6379"
  FRONTEND_URL="http://localhost:3000"
  ```
 #### Run database migrations and start the server:
  ```
  npx prisma migrate dev
  npm run dev
  ```

  ### 3. Frontend Setup
  ```
  cd fe
  npm install
  ```
  #### Create a .env.local file in the frontend directory:
  ```
  NEXT_PUBLIC_GRAPHQL_URL="http://localhost:4000/graphql"
  NEXT_PUBLIC_BACKEND_URL="http://localhost:4000"
  ```
 #### Start the development server:
  ```
  npm run dev

  ```

Navigate to http://localhost:3000 in your browser.

## 🔜 Future Roadmap

One of the core technical achievements of this project is the real-time price distribution system, designed to handle high throughput without hitting third-party API rate limits.
  1. **15-Second Price Caching:** Implement a Redis cache for the /quote query to prevent API rate-limiting during manual stock searches.
  2. **Demo Account:** A "Log in as Guest" button to allow anyone to easily explore the dashboard without registering.





