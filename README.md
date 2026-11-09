# FitPlate — Intelligent Meal Planning & Smart Grocery System

FitPlate is a full-stack MERN web application for personalized meal planning, nutrition tracking, and automated grocery list generation. Users set their dietary preferences, fitness goals, allergies, cooking time, budget, and current pantry items; FitPlate scores recipes, builds multi-day meal plans, generates merged grocery lists with pantry stock subtracted, and suggests budget-friendly meal swaps when a plan exceeds budget.

## Key Features

- **Authentication & Role-Based Access**: JWT authentication with `bcryptjs` password hashing and separate `user` and `admin` views.
- **Recipe Scoring & Meal Planner**: Generates 1 to 14 day meal plans across breakfast, lunch, snack, and dinner. Excludes recipes containing user allergens or violating dietary rules, and ranks candidates across diet, fitness goal, budget, cooking time, pantry match, and preferred cuisine.
- **Smart Grocery List**: Normalizes ingredient names, converts units (`kg` to `g`, `l` to `ml`), combines duplicate ingredients across meals, subtracts quantities already in the user's pantry, and estimates total cost.
- **Budget Optimizer**: Flags meal plans that exceed the user's budget and recommends lower-cost replacement dishes that can be applied in one click.
- **Pantry Manager**: Add, edit, and remove pantry stock with low-stock and expiry warnings.
- **Nutrition & Body Tracker**: Log daily food servings and track body measurements (weight, muscle mass, body fat percentage, waist) with Recharts visualizations.
- **Recipe Explorer & Meal Assistant**: Filter recipes by cuisine, dietary tag, meal type, prep time, calories, and cost, or ask the meal assistant what you can cook with the ingredients you have on hand.
- **Admin Dashboard**: Manage users, recipes, ingredients, and ingredient categories.

## Tech Stack

- **Frontend**: React 18, Vite, React Router v6, Tailwind CSS, Axios, Recharts
- **Backend**: Node.js, Express.js, MongoDB, Mongoose, JSON Web Tokens (JWT), bcryptjs

## Project Structure

```text
FitPlate/
├── backend/
│   ├── config/          # Database connection and environment defaults
│   ├── middleware/      # JWT auth and role-based access middleware
│   ├── models/          # Mongoose schemas (User, Recipe, MealPlan, PantryItem, etc.)
│   ├── routes/          # Express route handlers grouped by feature
│   ├── seed/            # Seed data (45 recipes, 41 ingredients, demo accounts)
│   ├── services/        # Core meal planning, scoring, grocery, and assistant logic
│   ├── test/            # Backend unit and API integration tests
│   ├── app.js           # Express application setup
│   ├── server.js        # Backend server entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable UI components and recipe cards
│   │   ├── context/     # Auth and toast/modal UI context providers
│   │   ├── hooks/       # Data fetching hook
│   │   ├── layouts/     # Navigation shell for user and admin views
│   │   ├── pages/       # Application pages (Dashboard, Planner, Grocery, etc.)
│   │   ├── services/    # Axios API client
│   │   ├── App.jsx      # Route definitions and guards
│   │   └── main.jsx     # React DOM entry point
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB** running locally on `mongodb://127.0.0.1:27017` (or a MongoDB Atlas URI configured in `backend/.env`)

### 1. Run the Backend

Open a terminal and run:

```bash
cd backend
npm install
npm run seed
npm run dev
```

*(You can also start the server without file watching using `npm start`. If the database is empty on first startup, `server.js` will automatically seed the initial recipes, ingredients, and demo accounts.)*

The backend API runs on `http://localhost:5000`.

### 2. Run the Frontend

Open a second terminal and run:

```bash
cd frontend
npm install
npm run dev
```

The React frontend runs on `http://localhost:5173` and proxies `/api` requests to `http://localhost:5000`.

## Demo Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **User** | `demo@fitplate.com` | `Demo@12345` |
| **Admin** | `admin@fitplate.com` | `Admin@12345` |

## Running Tests & Linting

**Backend**:
```bash
cd backend
npm test
npm run lint
```

**Frontend**:
```bash
cd frontend
npm run build
npm run lint
npm test
```
