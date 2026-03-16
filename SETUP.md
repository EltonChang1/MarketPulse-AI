# MarketPulse AI - User Authentication & Dashboard Setup

## 🎯 Overview

MarketPulse AI now features a complete user authentication system with personalized dashboards. Each user can:

- Create a personal account with email/password
- Build their own custom watchlist of stocks
- Access a professional dashboard showing:
  - **Commodities & ETFs** prominently (Oil, Gold, Silver, Market Indices)
  - **Search bar** with real-time autocomplete for any stock
  - **Personal watchlist** in a convenient side panel
  - **Detailed analysis** for each selected stock

## 🚀 Quick Start

### Backend Setup

1. **Install MongoDB Atlas (Free Tier)**
   - Go to https://www.mongodb.com/cloud/atlas
   - Create a free account
   - Create a cluster (M0 free tier)
   - Create a database user and get your connection string

2. **Update `.env` file** (`server/.env`)
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/marketpulse
   JWT_SECRET=your-secret-key-change-in-production
   ```

3. **Start the backend**
   ```bash
   cd server
   npm install  # if not done yet
   npm run dev
   # or
   npm start
   ```

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd web
   npm install  # if not done yet with legacy-peer-deps
   ```

2. **Start dev server**
   ```bash
   npm run dev
   ```

3. **Build for production**
   ```bash
   npm run build
   ```

## 📱 User Flows

### First Time User
1. Navigate to app
2. Redirected to **Sign Up** page
3. Create account with email/password (optional: first/last name)
4. Redirected to **Dashboard**
5. Add stocks to personal watchlist
6. Search and analyze any stock

### Returning User
1. Navigate to app
2. Redirected to **Sign In** page (if logged out)
3. Enter email/password
4. Dashboard loads with their personal watchlist
5. All preferences saved automatically

### Dashboard Features
- **Commodities Section**: Click any commodity/ETF to see detailed analysis
- **Search Bar**: Type stock name or ticker (e.g., "AAPL" or "Apple")
- **Watchlist Sidebar**: View all watched stocks with quick stats
  - Add new stocks via input field
  - Remove stocks with ✕ button
  - Click "View Analysis" for detailed breakdown
- **Back Button**: Return from detailed view to overview

## 🏗️ Architecture

### Backend Structure
```
server/src/
├── config/
│   └── db.js                 # MongoDB connection
├── middleware/
│   └── auth.js              # JWT authentication
├── models/
│   └── User.js              # User schema with watchlist
├── routes/
│   ├── auth.js              # Signup/signin/profile
│   ├── watchlist.js         # Watchlist management
│   └── search.js            # Stock search & commodities
├── services/
│   ├── analysisService.js
│   ├── marketService.js
│   ├── newsService.js
│   └── technicalService.js
└── index.js                 # Express app setup
```

### Frontend Structure
```
web/src/
├── components/
│   ├── SignUpPage.jsx       # Registration
│   ├── SignInPage.jsx       # Login
│   ├── HomePage.jsx         # Main dashboard
│   ├── SearchBar.jsx        # Search with autocomplete
│   ├── CommoditiesSection.jsx # ETF/commodity cards
│   ├── StockDetailView.jsx  # Existing detail component
│   └── ...
├── context/
│   └── AuthContext.jsx      # Global auth state
├── styles/
│   ├── auth.css            # Auth pages styling
│   ├── dashboard.css       # Dashboard styling
│   └── ...
└── App.jsx                  # Router setup
```

## 🔐 Security

- **Passwords**: Hashed with bcryptjs (10 salt rounds)
- **Tokens**: JWT with 7-day expiration
- **Protected Routes**: Dashboard requires valid token
- **HTTPS**: Recommended for production
- **Environment Variables**: Never commit secrets

## 📊 API Endpoints

### Authentication
```
POST   /api/auth/signup       # Register new user
POST   /api/auth/signin       # Login existing user
GET    /api/auth/me           # Get logged-in user (protected)
PUT    /api/auth/profile      # Update profile (protected)
```

### Watchlist
```
GET    /api/watchlist/        # Get user's watchlist (protected)
POST   /api/watchlist/add     # Add stock (protected)
DELETE /api/watchlist/remove/:symbol  # Remove stock (protected)
```

### Search & Discovery
```
GET    /api/search?q=AAPL     # Search stocks
GET    /api/commodities-etfs  # Get commodities & ETFs
```

### Analysis (Existing)
```
GET    /api/analyze           # Analyze multiple stocks
GET    /api/analyze/:symbol   # Analyze single stock
```

## 🎨 UI/UX Highlights

### Color Scheme
- **Primary**: Gradient (purple → blue): `#667eea` to `#764ba2`
- **Success**: Green `#10b981`
- **Danger**: Red `#ef4444`
- **Background**: Light gray gradient

### Responsive Design
- Desktop: Multi-column layout with sidebar
- Tablet: Adaptive grid layout
- Mobile: Single column, full-width cards

### Professional Elements
- Smooth transitions and animations
- Loading states with spinners
- Error banners with clear messaging
- Accessibility-first HTML structure
- Keyboard shortcuts (Enter to search/add)

## 🔧 Troubleshooting

### MongoDB Connection Issues
```
Error: "MONGODB_URI not set"
→ Add MONGODB_URI to server/.env
→ Check MongoDB Atlas connection string format
→ Verify IP whitelist includes your machine
```

### JWT Token Errors
```
Error: "Invalid or expired token"
→ Clear localStorage in browser
→ Re-login to get new token
→ Check JWT_SECRET matches between server and auth.js
```

### Build Errors
```
npm ERR! ERESOLVE could not resolve
→ Use: npm install --legacy-peer-deps
→ Or: npm install --force
```

### Stock Search Not Working
```
→ Search only supports predefined stock list
→ Type exact symbol (e.g., "AAPL") or company name
→ Check API BASE_URL in .env
```

## 📈 Future Enhancements

- [ ] Email verification on signup
- [ ] Password reset functionality
- [ ] Profile picture upload
- [ ] Watchlist sharing with other users
- [ ] Price alerts when stock moves X%
- [ ] More commodities and global markets
- [ ] 2FA authentication
- [ ] Dark mode theme toggle
- [ ] Historical price charts
- [ ] Options analysis

## 🚀 Deployment

### Frontend (Vercel/Netlify)
```bash
npm run build
# Deploy dist/ folder
```

### Backend (Render.com/Railway/Heroku)
```bash
# Set environment variables in deployment platform
# Add MongoDB connection string
# Add JWT secret
# Deploy src/index.js
```

## 📝 License

See LICENSE file in repository

---

**Questions?** Check GitHub issues or review the code comments for detailed implementation notes.
