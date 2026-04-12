# SkillBridge Backend API

Express + Prisma backend for SkillBridge.

## Tech Stack

- Node.js 20+
- Express
- Prisma
- PostgreSQL (Neon)
- Razorpay

## Scripts

- npm start: start API server
- npm run dev: start with nodemon
- npm test: run tests
- npm run test:coverage: run tests with coverage
- npm run seed: seed database

## Local Setup

1. Create .env file in backend root.
2. Add required environment variables.
3. Install dependencies:

npm install

4. Start server:

npm start

## Health and Docs

- Health: GET /health
- API docs summary: GET /api/docs

## Deployment

This repository includes GitHub Actions workflow for Azure App Service deployment:

- .github/workflows/main_skillbridge.yml

For Azure App Service:

- Runtime: Node 20 (Linux)
- Startup command: npm start
- Health check path: /health

## Required Environment Variables

- DATABASE_URL
- JWT_SECRET
- JWT_RESET_SECRET
- JWT_VERIFY_EMAIL_SECRET
- FRONTEND_URL
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
- EMAIL_USER
- EMAIL_PASS

Optional:

- RAZORPAY_WEBHOOK_SECRET
- RAZORPAY_MODE
- BACKEND_URL
- APP_URL
