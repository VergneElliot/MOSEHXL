# Chapter 1 — Fundamentals

Before touching any code in this project, you need to understand the tools it's built with. This chapter explains each one from scratch — no prior programming knowledge assumed.

---

## What Is JavaScript?

JavaScript is a programming language. It was originally created for web browsers — it's the language that makes websites interactive (clicking buttons, showing/hiding things, animating). Every browser has a JavaScript engine built in (Chrome uses V8, Firefox uses SpiderMonkey).

For a long time, JavaScript only ran in browsers. That changed with Node.js.

---

## What Is Node.js?

Node.js takes Chrome's V8 JavaScript engine and runs it outside the browser — on your computer, on a server, anywhere. This means you can write server-side code (APIs, database access, file operations) in JavaScript.

In this project, the **backend** runs on Node.js. When you do `npm run dev` in `MuseBar/backend/`, you're starting a Node.js process that listens for HTTP requests on port 3001.

---

## What Is TypeScript?

TypeScript is JavaScript with **types**. JavaScript is dynamically typed — a variable can be anything:

```javascript
// JavaScript — this works but is dangerous
let price = 10;
price = "hello";  // no error, but your math breaks later
```

TypeScript adds type annotations that catch errors before your code runs:

```typescript
// TypeScript — this catches the bug immediately
let price: number = 10;
price = "hello";  // ERROR: Type 'string' is not assignable to type 'number'
```

### Why use it?

When your codebase grows (like this project — ~200 files), you can't hold every variable's expected type in your head. TypeScript does it for you. It tells you when you're passing the wrong thing before you even run the code.

### Interfaces

TypeScript's most useful feature for this project is **interfaces** — they describe the shape of objects:

```typescript
interface Order {
  id: number;
  total_amount: number;
  payment_method: 'cash' | 'card' | 'split';  // can ONLY be one of these three
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;  // the ? means optional
}
```

Now if you try to create an order with `payment_method: 'bitcoin'`, TypeScript says no. This is why in `MuseBar/src/types/` there are files like `orders.ts`, `business.ts`, `auth.ts` — they define the shape of every piece of data in the system.

### Compilation

Browsers and Node.js don't understand TypeScript directly. It must be **compiled** to JavaScript first:

```
your-code.ts  →  [TypeScript Compiler (tsc)]  →  your-code.js
```

That's what `npm run build` does in the backend — it runs `tsc` to compile all `.ts` files into `.js` files in the `dist/` folder. In development, `ts-node` does this on-the-fly so you don't need to build manually.

---

## What Is npm?

npm (Node Package Manager) does two things:

1. **Installs packages** (libraries other people wrote). When you run `npm install`, it reads `package.json`, downloads everything listed in `dependencies`, and puts it in `node_modules/`.

2. **Runs scripts**. In `package.json` you define scripts:

```json
"scripts": {
  "dev": "ts-node src/app.ts",
  "build": "tsc",
  "start": "node dist/app.js"
}
```

Then `npm run dev` executes `ts-node src/app.ts`. That's it.

### package.json vs package-lock.json

- `package.json` — Lists your dependencies and their version ranges (e.g., `"express": "^4.21.2"` means "4.21.2 or newer, but less than 5.0.0")
- `package-lock.json` — Locks the exact versions that were installed. This ensures everyone on the team gets identical versions. Never edit it manually.

### node_modules

This folder contains all the downloaded packages. It's listed in `.gitignore` — you never commit it. Everyone runs `npm install` to recreate it from `package-lock.json`.

---

## The Two package.json Files

This project has two separate Node.js applications:

```
MOSEHXL/
├── MuseBar/
│   ├── package.json       ← Frontend (React app)
│   └── backend/
│       └── package.json   ← Backend (Express API)
```

They're completely independent. The frontend has React, Material-UI, etc. The backend has Express, PostgreSQL client, JWT, etc. You install and run them separately.

---

## What Is an API?

API stands for Application Programming Interface. In this project, it means: the backend exposes **HTTP endpoints** that the frontend calls.

The frontend doesn't touch the database directly. Instead:

```
[User clicks "Pay"]
    → Frontend sends HTTP POST to http://localhost:3001/api/orders
    → Backend receives the request
    → Backend validates data
    → Backend writes to PostgreSQL
    → Backend sends HTTP response (JSON)
    → Frontend shows success message
```

Every interaction between frontend and backend follows this pattern. The API is the contract between them.

### HTTP Methods

| Method | Meaning | Example |
|--------|---------|---------|
| GET | Read data | `GET /api/products` — get all products |
| POST | Create data | `POST /api/orders` — create a new order |
| PUT | Update data | `PUT /api/products/5` — update product #5 |
| DELETE | Delete data | `DELETE /api/orders/12` — delete order #12 |

### HTTP Status Codes

| Code | Meaning | When we use it |
|------|---------|----------------|
| 200 | OK | Successful GET or PUT |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Client sent invalid data |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Valid token but no permission |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Something broke on the backend |

### JSON

All data sent between frontend and backend is in **JSON** (JavaScript Object Notation):

```json
{
  "id": 42,
  "total_amount": 15.50,
  "payment_method": "card",
  "items": [
    { "product_name": "Heineken 33cl", "quantity": 2, "unit_price": 6.50 }
  ]
}
```

It's just a text format for structured data. Every API response is JSON. Every API request body is JSON.

---

## Environment Variables

Secrets (passwords, API keys) and configuration that changes between environments (development vs. production) are stored in **environment variables**, not in code.

The file `MuseBar/backend/.env` contains things like:

```env
DB_PASSWORD=my_secret_password
JWT_SECRET=a_long_random_string_for_signing_tokens
```

The code reads them via `process.env.DB_PASSWORD`. The `.env` file is in `.gitignore` — it never goes to GitHub. This is why `config/environment.ts` exists: it reads all env vars, validates they're present, and creates a typed config object.

---

## Git Basics

Git tracks changes to your code. Key concepts:

- **Commit** — a snapshot of all your files at a point in time, with a message describing what changed
- **Branch** — a parallel timeline. `main` is production, `development` is where we work
- **Merge** — combining one branch into another
- **Stash** — temporarily shelving uncommitted changes (what we did to switch from main to development)

The `.gitignore` file lists what Git should ignore (node_modules, .env, build artifacts). Anything listed there won't be committed.

---

---

## What Is a "Monorepo" Structure?

Our project contains two separate applications (frontend and backend) inside one Git repository:

```
MOSEHXL/
├── MuseBar/
│   ├── backend/     ← One application (the API server)
│   │   └── package.json
│   └── src/         ← Another application (the web interface)
├── package.json     ← Frontend's package.json (at MuseBar/ level)
```

This is common for small-to-medium projects. The alternative would be two separate repositories, but keeping them together makes it easier to ensure they stay compatible with each other — if you change an API endpoint name in the backend, you can update the frontend call in the same commit.

---

## What Is "Compiling" vs "Running"?

You'll see two modes:

1. **Development mode** (`npm run dev` for backend, `npm start` for frontend): Your code is compiled and run in real-time. When you save a file, it automatically recompiles and restarts. This is fast and convenient for development.

2. **Production mode** (`npm run build` then `npm start`): Your TypeScript is compiled to JavaScript once (creating a `dist/` folder for backend, a `build/` folder for frontend), and then the compiled JavaScript runs. This is what happens on the real server.

The key takeaway: TypeScript is a **development tool**. What actually runs on the server (or in the browser) is always JavaScript. TypeScript is just there to help you catch bugs before the code runs.

---

## Summary

| Concept | What it is | Where in the project |
|---------|-----------|---------------------|
| TypeScript | JavaScript with types — catches bugs at compile time | Every `.ts` and `.tsx` file |
| Node.js | Server-side JavaScript runtime | Backend runs on it |
| npm | Package manager + script runner | `package.json`, `npm install`, `npm run dev` |
| API | HTTP endpoints the frontend calls | `backend/src/routes/` |
| JSON | Data format between frontend and backend | Every request/response body |
| Environment variables | Config that stays out of code | `.env` file, `process.env.*` |
| Git | Version control | branches, commits, `.gitignore` |
| Compile | Convert TypeScript to JavaScript | `npm run build`, or on-the-fly with `ts-node` |
