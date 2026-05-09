# Library Locator — Sahitya Sabha

A mobile + web app for library staff to search books and find their shelf location instantly.

---

## Quick Setup

### Requirements
- Node.js (v18+)
- MySQL Server running
- Expo Go app (for phone) or any browser (for web)

### 1. Clone the repo
```bash
git clone https://github.com/Thankz81/LibraryLocatorSahityaSabha.git
cd LibraryLocatorSahityaSabha
```

### 2. Import the database
```bash
mysql -u root -proot < database/mssindor_yiilibrary.sql
```
> Replace `-proot` with your actual MySQL password, e.g. `-pmypassword`

### 3. Configure backend environment
```bash
cd Backend
cp .env.example .env
# edit .env and set real DB_HOST/DB_USER/DB_PASS/DB_NAME + JWT/EMAIL values
```

### 4. Run the backend
```bash
npm install
npm start
```
If required DB variables are missing, startup now prints exactly which keys are missing and how to fix them.

### 5. Update the API URL
Open `Mobile-app/constants/api.ts` and set your machine's IP:
```ts
export const API_BASE = "http://localhost:3000"; // web only
// OR for phone on same WiFi:
export const API_BASE = "http://192.168.X.X:3000"; // get IP from ipconfig
```

### 6. Run the app
```bash
cd Mobile-app
npm install
npm run web      # opens in browser
npm start        # scan QR with Expo Go on phone
```

### Login
```
Username: admin
Password: 1234
```

---

## How the App Works (Simple Explanation)

This app has two parts — a **backend** (server) and a **frontend** (mobile/web app). They talk to each other over the network.

---

## Backend (`Backend/server.js`)

This is a Node.js + Express server. It connects to a MySQL database and exposes 3 API routes:

### `POST /login`
Staff enters username and password. The server checks if they match the hardcoded credentials (`admin` / `1234`). If correct, it sends back a **token** (`sahitya-token-2024`). This token is like a key — the app uses it for all future requests.

### `GET /search?book=xyz`
Searches the database for books whose **title OR author** contains the search term. Requires the token in the request header (`Authorization: Bearer sahitya-token-2024`). Returns a list of matching books with name, author, publisher, subject, and shelf location.

### `GET /health`
Just returns `{ status: "ok" }`. Used to check if the server is alive.

The database connection has **auto-reconnect** — if MySQL drops the connection, the server automatically tries to reconnect every 5 seconds instead of crashing.

---

## Database (`database/mssindor_yiilibrary.sql`)

Two main tables:

**`yii_book`** — stores all books
| Column | What it stores |
|---|---|
| bookname | Title of the book |
| bookauthor | Author name |
| bookpublisher | Publisher name |
| bookshelf | Shelf code (e.g. A-12) |
| idsubject | Links to yii_subject table |

**`yii_subject`** — stores subject/category names
| Column | What it stores |
|---|---|
| idsubject | Unique ID |
| subject | Subject name (e.g. Science, History) |

The search query joins both tables so results include the subject name alongside book details.

---

## Mobile App (`Mobile-app/`)

Built with **React Native + Expo**. Uses **Expo Router** for navigation (file-based — each file in `app/` is a screen).

### File Structure
```
app/
  index.tsx         → Entry point, checks if logged in, redirects accordingly
  login.tsx         → Login screen
  (tabs)/
    home.tsx        → Main search screen
    profile.tsx     → Shows user info and session details
    settings.tsx    → Dark mode toggle + logout
    explore.tsx     → About & usage tips
    _layout.tsx     → Drawer navigation with logout button

context/
  AuthContext.tsx   → Stores login token, handles login/logout
  ThemeContext.tsx  → Stores light/dark mode preference

constants/
  api.ts            → Backend URL (change this when switching networks)
  theme.ts          → All colors for light and dark mode
```

### How Navigation Works
1. App opens → `index.tsx` checks if a token is saved
2. If token exists → goes directly to Home (no need to login again)
3. If no token → goes to Login screen
4. After login → token saved to device storage → goes to Home
5. Logout → token deleted → back to Login

### How Search Works
1. Staff types in the search bar (minimum 2 characters)
2. App waits 350ms after last keystroke (debounce — avoids too many requests)
3. Sends request to `/search?book=...` with the token in the header
4. Results appear as a dropdown list (up to 10 results)
5. Tap a result → animated card appears showing all book details
6. Shelf location shown prominently at the bottom — tap to copy it

### Auth Context (`context/AuthContext.tsx`)
Manages the login state across the whole app:
- On app start: reads saved token from device storage (AsyncStorage)
- `login(token)`: saves token to storage + memory
- `logout()`: removes token from storage + memory
- `isLoading`: true while reading from storage (shows spinner)
- Any screen can call `useAuth()` to get the token or trigger logout

### Theme Context (`context/ThemeContext.tsx`)
- Stores `"light"` or `"dark"` mode
- Saved to AsyncStorage so it persists after app restart
- Any screen uses `useThemeContext()` to get current colors via `Colors[mode]`

### Recent Searches
The last 6 book searches are saved to AsyncStorage under the key `recent_searches`. They appear on the home screen when the search bar is empty, so staff can quickly re-search recent books.

---

## Key Design Decisions

**Why hardcoded credentials?**
This is a simple internal tool for library staff — no user registration needed. A single admin account is enough.

**Why a static token?**
For simplicity. In a production app you'd use JWT with expiry, but for a local library tool a static token is fine.

**Why Expo Router?**
File-based routing makes it easy to add new screens — just create a new file in `app/`.

**Why `localhost` vs IP address?**
`localhost` only works when running the app in a browser on the same machine as the backend. For Expo Go on a phone, you need the actual IP address of the machine running the backend.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `MySQL connected` not showing | Check MySQL service is running: `net start MySQL80` |
| Login says "Cannot connect to server" | Make sure backend is running on port 3000 |
| App works on web but not on phone | Update `api.ts` with your PC's IP from `ipconfig` |
| Search returns nothing | Check the database was imported correctly |
| Token error after restart | Clear app storage and login again |

---

## Local Development (No Render)

If you only want to run on your local machine, you can ignore `render.yaml` completely.

### Backend (local)
```bash
cd Backend
cp .env.example .env
# set DB_HOST=localhost and fill DB_USER/DB_PASS/DB_NAME/JWT_SECRET/EMAIL_USER/EMAIL_PASS
npm install
npm start
```

### Mobile app (local)
```bash
cd Mobile-app
npm install
npm start
```

Use `http://localhost:3000/health` to verify backend is up.

---

## Cloud Deployment (Render Free Tier, Optional)

This repository includes a `render.yaml` at project root for one-click backend deployment to Render.

### 1) Push repository to GitHub
Render deploys from GitHub/GitLab.

### 2) Create Render Blueprint
- In Render dashboard choose **New +** → **Blueprint**.
- Select this repository.
- Render will detect:
  - `rootDir: Backend`
  - `buildCommand: npm install`
  - `startCommand: npm start`
  - `healthCheckPath: /health`

### 3) Set environment variables
Use `Backend/.env.example` as reference and set all required values in Render:
- `JWT_SECRET`
- `EMAIL_USER`
- `EMAIL_PASS`
- `DB_HOST`
- `DB_USER`
- `DB_PASS`
- `DB_NAME`

Optional but recommended:
- `FRONTEND_URL`
- `CORS_ORIGINS`
- `DB_POOL_LIMIT`

### 4) Configure CORS for your cloud frontend
If your frontend is hosted on a cloud URL, add it to `FRONTEND_URL` or `CORS_ORIGINS`.
Without this, API requests may be blocked by CORS.

### 5) Verify deployment
Open:
`https://<your-render-service>.onrender.com/health`

Expected:
```json
{ "status": "ok" }
```
