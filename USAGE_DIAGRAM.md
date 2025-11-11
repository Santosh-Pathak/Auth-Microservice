# 🎨 Visual Usage Guide

## 📊 How Your Deployed Auth Microservice Works

### The Big Picture

```
┌──────────────────────────────────────────────────────────────────┐
│                        YOUR ECOSYSTEM                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐         ┌──────────────────┐              │
│  │  Your Todo App  │  calls  │  Auth Microservice│              │
│  │   (Frontend)    │ ──────► │   (Backend API)   │              │
│  │                 │  HTTP   │                   │              │
│  │  React/Vue/     │ ◄────── │  Handles:         │              │
│  │  Angular        │ returns │  - Login/Register │              │
│  │                 │  tokens │  - JWT tokens     │              │
│  └─────────────────┘         │  - User sessions  │              │
│   Hosted on Vercel           └─────────┬─────────┘              │
│   FREE                                  │                         │
│                                         │ stores users            │
│                                         ▼                         │
│                              ┌──────────────────┐                │
│                              │  MongoDB Atlas   │                │
│                              │  (Database)      │                │
│                              │  FREE 512MB      │                │
│                              └──────────────────┘                │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Step-by-Step: User Login Flow

```
STEP 1: User fills login form
┌─────────────────────┐
│  Your Todo App      │
│                     │
│  [Email: john@..]   │
│  [Password: ***]    │
│  [  Login Button ]  │
└─────────────────────┘
         │
         │ User clicks Login
         ▼

STEP 2: Frontend sends request
┌─────────────────────┐
│  authService.js     │
│                     │
│  POST /auth/login   │
│  {                  │
│    email: "john@.." │
│    password: "***"  │
│  }                  │
└─────────────────────┘
         │
         │ HTTP Request
         ▼

STEP 3: Your deployed API processes
┌──────────────────────────────┐
│  Auth Microservice           │
│  (https://your-app.onrender) │
│                              │
│  1. Receives request         │
│  2. Checks MongoDB           │
│  3. Verifies password        │
│  4. Generates JWT token      │
│  5. Creates session          │
└──────────────────────────────┘
         │
         │ Returns response
         ▼

STEP 4: Frontend receives tokens
┌─────────────────────┐
│  Response:          │
│  {                  │
│    accessToken: "eyJ..."     │
│    refreshToken: "c2d..."    │
│    user: {          │
│      id: "123"      │
│      email: "john@.."│
│    }                │
│  }                  │
└─────────────────────┘
         │
         │ Saves tokens
         ▼

STEP 5: Store tokens locally
┌─────────────────────┐
│  localStorage       │
│                     │
│  accessToken: "eyJ.."│
│  refreshToken: "c2d.."│
└─────────────────────┘
         │
         │ User is now logged in!
         ▼

STEP 6: Access protected pages
┌─────────────────────┐
│  Dashboard Page     │
│                     │
│  Welcome, John!     │
│  [Your Todos]       │
│  [  Logout  ]       │
└─────────────────────┘
```

---

## 🔐 Making Protected API Calls

### Every request includes the token

```
┌─────────────────────┐
│  Your Frontend      │
│                     │
│  GET /auth/me       │
│                     │
│  Headers:           │
│  Authorization:     │
│  Bearer eyJhbGc...  │
└──────────┬──────────┘
           │
           │ Sends request with token
           ▼
┌──────────────────────────────┐
│  Auth Microservice           │
│                              │
│  1. Extracts token from      │
│     Authorization header     │
│  2. Verifies JWT signature   │
│  3. Checks expiration        │
│  4. Loads user from DB       │
│  5. Returns user data        │
└──────────┬───────────────────┘
           │
           │ Returns user data
           ▼
┌──────────────────────┐
│  Your Frontend       │
│                      │
│  Receives:           │
│  {                   │
│    id: "123"         │
│    email: "john@.."  │
│    firstName: "John" │
│  }                   │
└──────────────────────┘
```

---

## 🌐 Multiple Apps Using Same Auth

### One auth API serves many apps!

```
                  ┌──────────────────────────┐
                  │  Auth Microservice       │
                  │  (Deployed Once)         │
┌────────┐        │                          │        ┌─────────┐
│Web App │───────►│  https://your-app        │◄───────│ Mobile  │
│(React) │ Login  │     .onrender.com        │ Login  │ App     │
└────────┘        │                          │        └─────────┘
                  │  Endpoints:              │
┌────────┐        │  - /auth/login           │        ┌─────────┐
│Blog    │───────►│  - /auth/register        │◄───────│ Admin   │
│(Vue.js)│ Login  │  - /auth/me              │ Login  │ Panel   │
└────────┘        │  - /user/profile         │        └─────────┘
                  │                          │
                  └──────────┬───────────────┘
                             │
                             │ All users stored here
                             ▼
                  ┌──────────────────────┐
                  │  MongoDB Atlas       │
                  │  (One Database)      │
                  │                      │
                  │  Users Collection:   │
                  │  - john@email.com    │
                  │  - jane@email.com    │
                  │  - bob@email.com     │
                  └──────────────────────┘
```

**One Auth API = All Your Apps Authenticated!**

---

## 💻 Code Flow Diagram

### In Your React App

```javascript
// 1. User clicks Login button
<button onClick={handleLogin}>Login</button>

// 2. handleLogin function runs
const handleLogin = async () => {
  // 3. Call your deployed API
  const response = await fetch(
    'https://your-app.onrender.com/api/v1/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }
  );
  
  // 4. Get tokens from response
  const data = await response.json();
  
  // 5. Save tokens
  localStorage.setItem('accessToken', data.accessToken);
  
  // 6. User is logged in!
  navigate('/dashboard');
};

// 7. When accessing protected pages
const Dashboard = () => {
  useEffect(() => {
    // 8. Include token in request
    fetch('https://your-app.onrender.com/api/v1/auth/me', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`
      }
    })
    .then(res => res.json())
    .then(user => setUser(user));
  }, []);
  
  return <div>Welcome {user.firstName}!</div>;
};
```

---

## 🎯 What Each Part Does

### Your Frontend (React/Vue/Angular)
```
┌─────────────────────────────┐
│  YOUR RESPONSIBILITY        │
├─────────────────────────────┤
│                             │
│  • UI Components            │
│  • Login/Register Forms     │
│  • Store tokens             │
│  • Include token in headers │
│  • Handle logout            │
│                             │
└─────────────────────────────┘
```

### Auth Microservice (What You Deployed)
```
┌─────────────────────────────┐
│  HANDLED AUTOMATICALLY      │
├─────────────────────────────┤
│                             │
│  • Verify passwords         │
│  • Generate JWT tokens      │
│  • Manage sessions          │
│  • Handle OAuth             │
│  • Reset passwords          │
│  • Email verification       │
│                             │
└─────────────────────────────┘
```

### MongoDB Atlas (Database)
```
┌─────────────────────────────┐
│  STORES DATA                │
├─────────────────────────────┤
│                             │
│  • User accounts            │
│  • Passwords (hashed)       │
│  • Sessions                 │
│  • Refresh tokens           │
│                             │
└─────────────────────────────┘
```

---

## 📱 Real World Example: Building a Todo App

### What You Build

```
┌──────────────────────────────────────────────────┐
│  Your Todo App (Frontend)                        │
├──────────────────────────────────────────────────┤
│                                                   │
│  Pages:                                           │
│  • /login         → Login form                    │
│  • /register      → Register form                 │
│  • /dashboard     → Shows todos (protected)       │
│  • /profile       → User profile (protected)      │
│                                                   │
│  Components:                                      │
│  • Login.jsx      → Calls auth API login          │
│  • Register.jsx   → Calls auth API register       │
│  • TodoList.jsx   → Shows user's todos            │
│  • ProtectedRoute → Checks if user logged in      │
│                                                   │
└──────────────────────────────────────────────────┘
                        │
                        │ Calls
                        ▼
┌──────────────────────────────────────────────────┐
│  Auth Microservice (Already Built & Deployed)    │
├──────────────────────────────────────────────────┤
│                                                   │
│  You just call these URLs:                       │
│  POST /auth/register  → Create account           │
│  POST /auth/login     → Get tokens               │
│  GET  /auth/me        → Get user info            │
│  POST /auth/logout    → Logout                   │
│                                                   │
└──────────────────────────────────────────────────┘
```

### You DON'T Build

```
❌ Password hashing logic
❌ JWT generation code
❌ Token verification
❌ Database connection
❌ Session management
❌ OAuth integration
❌ Email verification system

✅ All handled by your deployed microservice!
```

---

## 🎬 Complete User Journey

```
1. User visits: https://mytodoapp.com
   ↓
2. Clicks "Login"
   ↓
3. Enters email & password
   ↓
4. Your React app sends to:
   https://your-app.onrender.com/api/v1/auth/login
   ↓
5. Auth API checks database
   ↓
6. Returns: { accessToken, refreshToken, user }
   ↓
7. React app saves tokens in localStorage
   ↓
8. Redirects to /dashboard
   ↓
9. Dashboard checks: Is token in localStorage?
   ↓
10. Yes! Shows user's todos
   ↓
11. Every API call includes:
    Authorization: Bearer <token>
   ↓
12. When token expires (15 min):
    Auto-refresh with refreshToken
   ↓
13. User can logout:
    Calls /auth/logout
    Clears localStorage
    Redirects to /login
```

---

## 💡 Key Takeaway

### It's Just HTTP Calls!

```
Your App                    Your Deployed API
   │                              │
   │  POST /auth/login            │
   ├─────────────────────────────►│
   │                              │ ✓ Check password
   │                              │ ✓ Generate token
   │                              │
   │  { accessToken: "..." }      │
   │◄─────────────────────────────┤
   │                              │
   │  Save token                  │
   │                              │
   │  GET /auth/me                │
   │  Authorization: Bearer ...   │
   ├─────────────────────────────►│
   │                              │ ✓ Verify token
   │                              │ ✓ Get user
   │                              │
   │  { user: {...} }             │
   │◄─────────────────────────────┤
   │                              │
```

**That's it! Your frontend makes HTTP requests, your API responds.**

---

## 🎯 Summary in 3 Sentences

1. **Deploy your auth microservice** → You get a URL like `https://your-app.onrender.com`

2. **In your frontend apps**, make HTTP calls to that URL for login/register/etc

3. **Store the tokens** it gives you and include them in headers for protected requests

**Simple!** 🎉


