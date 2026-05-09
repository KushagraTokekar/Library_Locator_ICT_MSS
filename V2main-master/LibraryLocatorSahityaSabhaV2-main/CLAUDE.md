# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Library Book Locator app for Sahitya Sabha — lets library staff search books and find their shelf location. Built with React Native (Expo) + Node.js/Express + MySQL.

## Running the Project

### Backend
```bash
cd Backend
npm install
node server.js        # runs on port 3000
# or: npx nodemon server.js  (auto-restart on change)
```

### Mobile App
```bash
cd Mobile-app
npm install
npm start             # Expo dev server
npm run android       # Android emulator
npm run ios           # iOS simulator
npm run web           # Browser
npm run lint          # ESLint
```

### Database
Import the SQL dump to MySQL before starting the backend:
```bash
mysql -u root -p < database/mssindor_yiilibrary.sql
```

## Critical: Backend IP Address

The mobile app hardcodes the backend IP in two files — **update these when the network changes**:
- `Mobile-app/app/login.tsx:32` — `http://192.168.1.4:3000/login`
- `Mobile-app/app/(tabs)/home.tsx:49` — `http://192.168.1.7:3000/search`

These must match the machine running the backend on the local network.

## Architecture

**Backend** (`Backend/server.js`) — single-file Express server, no router separation. DB connection is inline (not using `db.js`). Two endpoints:
- `GET /search?book=<query>` — case-insensitive LIKE search on `yii_book` joined with `yii_subject`, returns `{bookname, bookauthor, bookpublisher, bookshelf, subject}`
- `POST /login` — hardcoded credentials (`admin` / `1234`), returns `{success, message}`

**Mobile App** — Expo Router (file-based routing), TypeScript, React Native Paper for UI components.

Navigation flow:
1. App starts → `app/index.tsx` redirects to `/login`
2. Login success → navigates to `/(tabs)/home`
3. `(tabs)` uses a **Drawer** navigator (not bottom tabs despite the folder name) with: Home, Profile, Settings

Key patterns:
- Theme (light/dark) managed via `context/ThemeContext.tsx`, persisted in AsyncStorage under key `"theme"`. Access via `useThemeContext()`.
- All color tokens come from `constants/theme.ts` → `Colors[mode]`. Use `theme.background`, `theme.card`, `theme.text`, `theme.tint`, `theme.icon`.
- Search is debounced 400ms in `home.tsx`, fetches up to 5 suggestions, shows animated result card on selection.

## Database Schema (relevant tables)

- `yii_book`: `idbuku`, `bookname`, `bookauthor`, `bookpublisher`, `bookshelf`, `idsubject`
- `yii_subject`: `idsubject`, `subject`
- Foreign key: `yii_book.idsubject → yii_subject.idsubject`

The database name is `mssindor_yiilibrary`. Default credentials: `root` / `root`.
