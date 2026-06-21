# 🧠 COGNO - FocusFlow Mental Wellness Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb)](https://reactjs.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)](https://tailwindcss.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini-AI-orange)](https://ai.google.dev/)

**AI-Powered Mental Wellness & Productivity Platform**  
*Architected & Developed by [Nagabhushana](https://mr-nagabhushanaraju-s.engineer)*

---

## 🎯 Problem Statement Alignment

COGNO addresses the critical need for **accessible mental health support** and **productivity enhancement** through:

1. **AI-Powered Journal Analysis** - Real-time emotional intelligence using Gemini 1.5 Pro
2. **Crisis Detection & Prevention** - Automated pattern recognition for self-harm indicators
3. **Personalized Mental Health Companion** - Context-aware conversational AI support
4. **Productivity Tools** - Eisenhower Matrix, Pomodoro Timer, Task Management
5. **Cognitive Enhancement** - Brain training games (memory, logic puzzles)
6. **Holistic Wellness** - Fitness tracking with step counter and exercise guides

---

## 🏗️ Architecture & Tech Stack

### **Frontend**
- **React 18.3** with **TypeScript 5.5** - Type-safe, component-based UI
- **TailwindCSS 3.4** - Utility-first styling with custom design tokens
- **Radix UI** - Accessible, unstyled components (40+ components)
- **TanStack Query v5** - Server state management & caching
- **Recharts** - Data visualization for stress trigger timelines
- **Framer Motion** - Smooth animations & transitions

### **Backend**
- **Node.js** with **Express**
- **Drizzle ORM** - Type-safe database queries
- **PostgreSQL (Neon)** - Cloud-native relational database
- **Server-Sent Events (SSE)** - Real-time AI streaming responses

### **AI Integration**
- **Google Gemini 1.5 Pro** - Advanced journal analysis with structured JSON output
- **Gemini 1.5 Flash** - Low-latency conversational companion
- **Custom Safety Guardrails** - Pre-computation regex filters for crisis detection

---

## 🔒 Security Features

### **Authentication & Authorization**
- User session management with secure token storage
- Role-based access control for sensitive operations

### **Data Protection**
- **Input Sanitization** - All user inputs validated & escaped
- **SQL Injection Prevention** - Drizzle ORM parameterized queries
- **XSS Protection** - React's built-in JSX sanitization
- **CORS Configuration** - Restricted origins for API endpoints

### **Crisis Safety Protocol**
1. **Pre-Computation Guardrail** - Regex-based keyword detection (self-harm, suicide)
2. **AI-Based Sentiment Analysis** - Gemini Pro emotion intensity scoring
3. **Instant Crisis Overlay** - Emergency contact display with helpline numbers
4. **Data Privacy** - Encrypted journal entries, no third-party sharing

### **API Security**
- Environment variable protection for API keys
- Rate limiting on AI endpoints
- Request validation middleware
- Secure error handling (no stack trace leakage)

---

## ⚡ Efficiency & Performance

### **Frontend Optimizations**
- **Code Splitting** - Vite dynamic imports for route-based chunks
- **React Query Caching** - Stale-while-revalidate strategy reduces API calls
- **Memoization** - `useMemo` and `useCallback` for expensive computations
- **Virtual Scrolling** - Efficient rendering of large task/journal lists

### **Backend Optimizations**
- **Database Indexing** - Optimized queries on `userId` and `timestamp` columns
- **Connection Pooling** - Reusable PostgreSQL connections
- **SSE Streaming** - Incremental AI response delivery (reduces perceived latency)
- **Batch Operations** - Bulk stress trigger insertion

### **Build & Bundle**
- **Tree Shaking** - Dead code elimination via Vite
- **Asset Optimization** - Image compression, lazy loading
- **Production Build** - Minified JS/CSS, gzip compression

---

## 🧪 Testing Strategy

### **Unit Tests**
- **Component Testing** - React Testing Library for UI components
- **Hook Testing** - Custom hooks (`use-tasks`, `use-timer`, `use-focus-session`)
- **Utility Testing** - Input validation, date formatting, notification logic

### **Integration Tests**
- **API Route Testing** - Supertest for backend endpoints
- **Database Testing** - Mock Drizzle ORM queries with test fixtures
- **AI Integration** - Mocked Gemini API responses for deterministic tests

### **E2E Tests**
- **User Flows** - Playwright scenarios (journal creation → AI analysis → crisis handling)
- **Cross-Browser** - Chrome, Firefox, Safari compatibility

### **Coverage Targets**
- Line Coverage: 80%+
- Branch Coverage: 75%+
- Critical Paths: 100% (crisis detection, data persistence)

---

## ♿ Accessibility (WCAG 2.1 AA Compliance)

### **Semantic HTML**
- Proper heading hierarchy (`<h1>` → `<h6>`)
- Landmark roles (`<nav>`, `<main>`, `<aside>`)
- Form labels with `for` attributes

### **ARIA Implementation**
- **Modal Dialogs** - `aria-modal`, `aria-labelledby`, focus trap
- **Dynamic Content** - `aria-live` regions for AI streaming responses
- **Interactive Elements** - `aria-expanded`, `aria-pressed` for toggles
- **Screen Reader Support** - Descriptive `aria-label` on icon-only buttons

### **Keyboard Navigation**
- **Tab Order** - Logical focus flow through components
- **Shortcuts** - `Ctrl+K` for command palette, `Esc` for modals
- **Focus Indicators** - High-contrast outlines on interactive elements

### **Visual Accessibility**
- **Color Contrast** - WCAG AAA compliance (7:1 ratio for body text)
- **Dark Mode** - Theme toggle with system preference detection
- **Scalable Typography** - Rem-based sizing, respects user font settings
- **Motion Preferences** - Reduced motion support via `prefers-reduced-motion`

---

## 📦 Code Quality

### **TypeScript Strictness**
```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitAny": true,
  "strictNullChecks": true
}
```

### **Code Standards**
- **ESLint** - Airbnb style guide with React hooks rules
- **Prettier** - Consistent formatting (2-space indent, semicolons)
- **Husky** - Pre-commit hooks for linting & type-checking

### **Component Architecture**
- **Atomic Design** - Atoms → Molecules → Organisms → Pages
- **Custom Hooks** - Reusable stateful logic extraction
- **Prop Validation** - TypeScript interfaces for all components

### **Database Schema**
```typescript
// Type-safe schema with Drizzle ORM
export const journals = pgTable('journals', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  content: text('content').notNull(),
  emotions: jsonb('emotions').notNull(), // AI-extracted
  intensity: integer('intensity').notNull(), // 1-10 scale
  crisisFlag: boolean('crisis_flag').default(false),
  createdAt: timestamp('created_at').defaultNow()
});
```

---

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+
- PostgreSQL (or Neon cloud database)
- Gemini API key

### **Installation**
```bash
# Clone repository
git clone https://github.com/Mr-nagabhushana-at-Git-hub/COGNO.git
cd COGNO

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add DATABASE_URL and GEMINI_API_KEY

# Push database schema
npm run db:push

# Start development server
npm run dev
```

### **Build for Production**
```bash
npm run build
npm run preview
```

---

## 📊 Features Breakdown

### **1. AI Journal Analysis**
- Natural language processing of mental health journal entries
- Emotion extraction (joy, sadness, anger, fear, anxiety)
- Intensity scoring (1-10 scale)
- Automated stress trigger identification

### **2. Real-Time Companion Chat**
- Context-aware responses based on user's trigger history
- Server-Sent Events for streaming AI output
- Crisis intervention escalation

### **3. Productivity Suite**
- **Eisenhower Matrix** - Task prioritization (urgent/important quadrants)
- **Pomodoro Timer** - 25-min focus sessions with break tracking
- **Task Management** - CRUD operations with due dates & categories

### **4. Brain Training**
- **Memory Game** - Card matching with difficulty levels
- **Logic Puzzles** - Pattern recognition challenges

### **5. Fitness Tracking**
- Step counter with daily goals
- Exercise library with video guides

---

## 🏆 Competitive Advantages

1. **Privacy-First** - On-premise deployment option, no data selling
2. **Offline Capability** - Service Worker caching for core features
3. **Multi-Platform** - Responsive design (mobile, tablet, desktop)
4. **Extensible** - Plugin architecture for custom integrations
5. **Open Source Ready** - MIT license, community contributions welcome

---

## 📄 License
**Intellectual Property:** Nagabhushana  
**License:** MIT (Open Source)

---

## 🌟 Acknowledgments
- **Design System:** Inspired by Vercel's design philosophy
- **AI Models:** Powered by Google Gemini
- **UI Components:** Built on Radix UI primitives

**Built with ❤️ for mental wellness advocacy**  
