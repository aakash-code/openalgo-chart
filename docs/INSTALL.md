# Installation Guide

This guide covers setting up OpenAlgo Chart for local development and Docker deployment.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Docker Setup](#docker-setup)
- [Environment Configuration](#environment-configuration)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### For Local Development

- **Node.js** 20.x or later
- **npm** 10.x or later
- **Git**

### For Docker Deployment

- **Docker** 20.x or later
- **Docker Compose** (optional, for multi-container setup)

### Backend Requirements

This frontend requires the OpenAlgo backend to be running:
- **REST API**: Port 5000
- **WebSocket**: Port 8765

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/openalgo-chart.git
cd openalgo-chart
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment (Optional)

Create a `.env` file in the project root for custom configuration:

```env
# API Configuration
VITE_API_BASE=http://127.0.0.1:5000
VITE_WS_URL=ws://127.0.0.1:8765
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at **http://localhost:5001**

### 5. Build for Production (Optional)

```bash
npm run build
```

The production build will be output to the `dist/` directory.

### 6. Preview Production Build

```bash
npm run preview
```

---

## Docker Setup

### Option 1: Build and Run with Docker

#### Build the Docker Image

```bash
# From the openalgo-chart directory
docker build -t openalgo-chart .
```

#### Run the Container

```bash
docker run -d -p 5001:80 --name openalgo-chart openalgo-chart
```

The application will be available at **http://localhost:5001**

#### Stop the Container

```bash
docker stop openalgo-chart
docker rm openalgo-chart
```

### Option 2: Docker Compose (Recommended for Full Stack)

Create a `docker-compose.yml` file in the project root:

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5001:80"
    depends_on:
      - backend
    networks:
      - openalgo-network

  backend:
    image: openalgo/backend:latest  # Replace with actual backend image
    ports:
      - "5000:5000"
      - "8765:8765"
    environment:
      - DATABASE_URL=your_database_url
    networks:
      - openalgo-network

networks:
  openalgo-network:
    driver: bridge
```

#### Start All Services

```bash
docker-compose up -d
```

#### Stop All Services

```bash
docker-compose down
```

#### View Logs

```bash
# All services
docker-compose logs -f

# Frontend only
docker-compose logs -f frontend
```

### Option 3: Development with Docker

For development with hot-reload inside Docker:

```bash
# Create a development Dockerfile (Dockerfile.dev)
docker build -f Dockerfile.dev -t openalgo-chart-dev .

# Run with volume mount for hot-reload
docker run -d \
  -p 5001:5001 \
  -v $(pwd)/src:/app/src \
  -v $(pwd)/public:/app/public \
  --name openalgo-chart-dev \
  openalgo-chart-dev
```

---

## Environment Configuration

### Development Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE` | `http://127.0.0.1:5000` | OpenAlgo REST API base URL |
| `VITE_WS_URL` | `ws://127.0.0.1:8765` | WebSocket server URL |

### Production Environment

For production Docker deployments, the nginx configuration handles:
- SPA routing (all routes serve `index.html`)
- Static asset caching (1 year for JS, CSS, images)
- Gzip compression (if enabled in nginx)

To customize the API endpoint in production, you may need to:
1. Update `nginx.conf` with proxy settings
2. Or configure the frontend to use absolute URLs

---

## Available Scripts

### Development

```bash
# Start development server (hot-reload)
npm run dev

# Type check without emit
npm run type-check

# Type check in watch mode
npm run type-check:watch

# Lint code
npm run lint

# Fix lint errors automatically
npm run lint:fix
```

### Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Open Vitest UI
npm run test:ui

# Run E2E tests (Playwright)
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Debug E2E tests
npm run test:e2e:debug

# View E2E test report
npm run test:e2e:report
```

### Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

---

## Project Structure

```
openalgo-chart/
├── src/
│   ├── components/     # React components
│   │   ├── Chart/      # Chart-related components
│   │   ├── Watchlist/  # Watchlist components
│   │   ├── Toolbar/    # Drawing toolbar
│   │   └── ...
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API and data services
│   ├── store/          # Zustand state stores
│   ├── context/        # React context providers
│   ├── plugins/        # Chart plugins (line-tools, etc.)
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript type definitions
│   └── constants/      # Application constants
├── public/             # Static assets
├── tests/              # Unit tests
├── e2e/                # End-to-end tests
├── docs/               # Documentation
├── dist/               # Production build output
├── Dockerfile          # Production Docker image
├── nginx.conf          # Nginx configuration for Docker
├── vite.config.ts      # Vite configuration
├── tsconfig.json       # TypeScript configuration
└── package.json        # Dependencies and scripts
```

---

## Troubleshooting

### Node.js Version Issues

Ensure you're using Node.js 20+:

```bash
node --version  # Should be v20.x.x or higher

# Using nvm to switch versions
nvm install 20
nvm use 20
```

### Port Already in Use

If port 5001 is occupied:

```bash
# Use a different port
npm run dev -- --port 3000

# Or find and kill the process using port 5001
# Windows
netstat -ano | findstr :5001
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :5001
kill -9 <PID>
```

### Docker Build Fails

```bash
# Clean Docker cache and rebuild
docker builder prune -f
docker build --no-cache -t openalgo-chart .
```

### TypeScript Errors

```bash
# Clear TypeScript cache
rm -rf node_modules/.cache/typescript
npm run type-check
```

### Dependency Issues

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### WebSocket Connection Failed

1. Ensure the OpenAlgo backend is running on port 8765
2. Check firewall settings
3. Verify the WebSocket URL in your environment configuration

### CORS Issues in Development

The Vite dev server proxies API requests automatically. If you encounter CORS issues:
1. Ensure you're accessing the app via `http://localhost:5001`
2. Check that the backend allows requests from the frontend origin

---

## Support

For issues and feature requests, please open an issue on the GitHub repository.
