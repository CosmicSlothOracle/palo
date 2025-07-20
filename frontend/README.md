# KOSGE Frontend

Modern React frontend for the KOSGE event management system, optimized for Netlify deployment.

## ✨ Features

- ✅ **React 18** with TypeScript
- ✅ **Tailwind CSS** for styling
- ✅ **Vite** for fast development and building
- ✅ **Environment-based API configuration**
- ✅ **JWT Authentication** with React Context
- ✅ **Event Management** - CRUD operations for events
- ✅ **Participant Registration** - Public and admin views
- ✅ **File Upload** - Event image management
- ✅ **CSV Export** - Participant data export
- ✅ **Responsive Design** - Mobile-first approach

## 🚀 Quick Start

### Local Development

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Set Environment Variables**

   ```bash
   # Create .env.local file
   echo "VITE_API_URL=http://localhost:10000" > .env.local
   ```

3. **Start Development Server**

   ```bash
   npm run dev
   # Opens http://localhost:3000
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

### Production Build

```bash
npm run build
# Output: dist/ directory ready for deployment
```

## 🌐 Deployment on Netlify

### Option 1: Direct Repository Deploy

1. **Connect Repository** to Netlify
2. **Set Build Command**: `npm run build`
3. **Set Publish Directory**: `dist`
4. **Add Environment Variables**:
   - `VITE_API_URL=https://kosge-backend.onrender.com`

### Option 2: Manual Deploy

```bash
# Build production version
npm run build

# Deploy to Netlify (with Netlify CLI)
npx netlify deploy --prod --dir=dist
```

## ⚙️ Configuration

### Environment Variables

| Variable       | Development              | Production                           | Description          |
| -------------- | ------------------------ | ------------------------------------ | -------------------- |
| `VITE_API_URL` | `http://localhost:10000` | `https://kosge-backend.onrender.com` | Backend API URL      |
| `VITE_DEBUG`   | `true`                   | `false`                              | Enable debug logging |

### API Configuration

The frontend automatically detects the environment and configures the API accordingly:

```typescript
// src/config/api.ts
const getApiBaseUrl = (): string => {
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_URL || "http://localhost:10000";
  }
  return import.meta.env.VITE_API_URL || "https://kosge-backend.onrender.com";
};
```

## 🔧 Architecture

### Component Structure

```
src/
├── components/          # React components
│   ├── EventCard.tsx    # Event display
│   ├── EventForm.tsx    # Event editing
│   ├── LoginForm.tsx    # Authentication
│   ├── ParticipantForm.tsx  # Registration
│   ├── DataExport.tsx   # CSV export
│   └── ...
├── context/             # React Context
│   └── AuthContext.tsx  # Authentication state
├── config/              # Configuration
│   └── api.ts           # API endpoints
├── types.ts             # TypeScript types
└── App.tsx              # Main application
```

### Key Features

#### 🔐 Authentication

- JWT-based authentication with automatic token refresh
- Secure storage in localStorage
- Protected routes for admin features

#### 📅 Event Management

- Public view for event browsing
- Admin CRUD operations
- Image upload with preview
- Event reset functionality

#### 👥 Participant Management

- Public registration form
- Admin participant list
- CSV export functionality
- Real-time participant count

## 🔄 Migration from Old System

This frontend replaces the hybrid system with:

### ✅ Improvements

- **Unified Architecture**: Single React app instead of mixed HTML/React
- **Environment Configuration**: No hardcoded URLs
- **Modern Build System**: Vite instead of complex Netlify build
- **Type Safety**: Full TypeScript coverage
- **Better UX**: Consistent React components

### 🗑️ Removed

- ❌ **Netlify Functions**: Moved to dedicated backend
- ❌ **Mixed HTML/JS**: Pure React implementation
- ❌ **Complex Build Pipeline**: Simplified to single Vite build
- ❌ **Hardcoded APIs**: Environment-based configuration

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

## 📦 Scripts

| Script              | Description              |
| ------------------- | ------------------------ |
| `npm run dev`       | Start development server |
| `npm run build`     | Build for production     |
| `npm run build:lib` | Build library version    |
| `npm run preview`   | Preview production build |
| `npm run lint`      | Run ESLint               |
| `npm test`          | Run tests                |

## 🐛 Troubleshooting

### Common Issues

1. **API Connection Failed**

   - Check `VITE_API_URL` environment variable
   - Verify backend is running on correct port
   - Check CORS configuration

2. **Authentication Issues**

   - Clear localStorage: `localStorage.clear()`
   - Check JWT token validity
   - Verify admin credentials

3. **Build Errors**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check TypeScript errors: `npm run lint`

## 🔗 Related

- **Backend**: `../backend/` - Flask API server for Render
- **Docs**: `../docs/` - Static website files
- **Scripts**: `../scripts/` - Build and deployment utilities

---

**Ready for production deployment on Netlify! 🚀**
