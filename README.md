# Grid UI

![Grid Banner](../grid-docs/readme-assets/banner.png)

> **Beautiful, modern interface for Grid Platform** - Infrastructure Orchestration Platform UI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

## 🎯 Overview

Grid UI is the modern, responsive frontend interface for the Grid Infrastructure Orchestration Platform. Built with React, TypeScript, and Tailwind CSS, it provides an intuitive way to manage infrastructure across multiple cloud providers.

## ✨ Key Features

- **🎨 Modern Design**: Clean, professional interface with dark/light themes
- **📱 Responsive**: Works perfectly on desktop, tablet, and mobile
- **⚡ Real-time Updates**: Live deployment status and progress tracking
- **🌐 Multi-Cloud**: Manage GCP, AWS, and Azure resources in one place
- **📊 Dashboards**: Visual infrastructure monitoring and metrics
- **🔄 Environment Management**: Create, clone, and manage environments
- **📋 Release Queue**: Visual release management and deployment pipeline
- **🔍 Search & Filter**: Find resources quickly with advanced filtering

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Grid UI                              │
├─────────────────────────────────────────────────────────────┤
│  Components Layer                                           │
│  ├── Dashboard    ├── Infrastructure  ├── Environments     │
│  ├── Monitoring   ├── Release Queue   ├── Settings         │
│  └── Auth         └── Notifications   └── Help             │
├─────────────────────────────────────────────────────────────┤
│  State Management (Zustand)                                │
├─────────────────────────────────────────────────────────────┤
│  API Layer (Axios + WebSocket)                             │
├─────────────────────────────────────────────────────────────┤
│  Grid Core API (Backend)                                   │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Grid Core API running (see [grid-core](https://github.com/gridplatform/grid-core))

### Installation

```bash
# Clone the repository
git clone https://github.com/gridplatform/grid-ui.git
cd grid-ui

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Set up your environment variables
# Edit .env with your API endpoint

# Start the development server
npm run dev
```

### Environment Variables

```bash
# API Configuration
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000/ws

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true

# Theme
VITE_DEFAULT_THEME=light
```

## 📚 Project Structure

```
grid-ui/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Basic UI components (Button, Input, etc.)
│   │   ├── forms/          # Form components
│   │   ├── charts/         # Chart and visualization components
│   │   └── layout/         # Layout components (Header, Sidebar, etc.)
│   ├── pages/              # Page components
│   │   ├── Dashboard/      # Main dashboard
│   │   ├── Infrastructure/ # Infrastructure management
│   │   ├── Environments/   # Environment management
│   │   ├── Monitoring/     # Monitoring and metrics
│   │   └── Settings/       # User settings
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API services
│   ├── store/              # State management (Zustand)
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   └── styles/             # Global styles and themes
├── public/                 # Static assets
├── docs/                   # Documentation
└── tests/                  # Test files
```

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build

# Testing
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
npm run test:e2e         # Run end-to-end tests

# Linting & Formatting
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format code with Prettier
npm run type-check       # Run TypeScript type checking

# Storybook
npm run storybook        # Start Storybook
npm run build-storybook  # Build Storybook
```

### Component Development

We use Storybook for component development and documentation:

```bash
# Start Storybook
npm run storybook

# Visit http://localhost:6006
```

### State Management

We use Zustand for state management:

```typescript
// Example store
import { create } from 'zustand'

interface InfrastructureStore {
  resources: Resource[]
  loading: boolean
  fetchResources: () => Promise<void>
  addResource: (resource: Resource) => void
}

export const useInfrastructureStore = create<InfrastructureStore>((set) => ({
  resources: [],
  loading: false,
  fetchResources: async () => {
    set({ loading: true })
    const resources = await api.getResources()
    set({ resources, loading: false })
  },
  addResource: (resource) => set((state) => ({ 
    resources: [...state.resources, resource] 
  }))
}))
```

## 🎨 Design System

### Theme Configuration

```typescript
// Tailwind config with custom theme
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
        grid: {
          blue: '#0066cc',
          green: '#00cc66',
          orange: '#ff6600',
        }
      }
    }
  }
}
```

### Component Library

Our component library includes:

- **Layout**: Header, Sidebar, Footer, Container
- **Forms**: Input, Select, Checkbox, Radio, Button
- **Data Display**: Table, Card, Badge, Progress, Charts
- **Feedback**: Alert, Toast, Modal, Loading
- **Navigation**: Breadcrumb, Pagination, Tabs

## 📱 Responsive Design

The UI is fully responsive with breakpoints:

- **Mobile**: < 640px
- **Tablet**: 640px - 1024px  
- **Desktop**: > 1024px

## 🔌 API Integration

### API Service Layer

```typescript
// Example API service
class InfrastructureService {
  private api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
  })

  async getResources(): Promise<Resource[]> {
    const response = await this.api.get('/api/v1/infrastructure')
    return response.data
  }

  async deployResource(config: DeployConfig): Promise<Deployment> {
    const response = await this.api.post('/api/v1/infrastructure/deploy', config)
    return response.data
  }
}
```

### WebSocket Integration

```typescript
// Real-time updates
const useWebSocket = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  
  useEffect(() => {
    const ws = new WebSocket(import.meta.env.VITE_WS_URL)
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data)
      // Handle real-time updates
    }
    setSocket(ws)
    
    return () => ws.close()
  }, [])
  
  return socket
}
```

## 🧪 Testing

### Unit Testing

```bash
# Run unit tests
npm run test

# Run with coverage
npm run test:coverage
```

### E2E Testing

```bash
# Run end-to-end tests
npm run test:e2e
```

### Testing Utilities

```typescript
// Test utilities
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}
```

## 🚀 Deployment

### Build for Production

```bash
# Build the application
npm run build

# The build files will be in the 'dist' directory
```

### Environment Configuration

```bash
# Production environment
VITE_API_URL=https://api.gridplatform.org
VITE_WS_URL=wss://api.gridplatform.org/ws
VITE_ENABLE_ANALYTICS=true
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write tests for new components
- Update Storybook stories
- Ensure responsive design
- Test across different browsers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Grid Docs](https://github.com/gridplatform/grid-docs)
- **Issues**: [GitHub Issues](https://github.com/gridplatform/grid-ui/issues)
- **Discussions**: [GitHub Discussions](https://github.com/gridplatform/grid-ui/discussions)

## 🔗 Related Projects

- [Grid Core](https://github.com/gridplatform/grid-core) - Backend API
- [Grid Terraform](https://github.com/gridplatform/grid-terraform) - Infrastructure modules
- [Grid Operator](https://github.com/gridplatform/grid-operator) - Kubernetes operator
- [Grid Docs](https://github.com/gridplatform/grid-docs) - Documentation

---

**Built with ❤️ by the Grid Platform team**