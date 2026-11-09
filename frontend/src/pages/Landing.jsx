import { Link } from 'react-router-dom';
import { useAuth } from '../context/Auth';

const STEPS = [
  [
    '1',
    'Tell us about you',
    'Share your diet, fitness goal, allergies, budget, cooking time, and what is already in your pantry.',
  ],
  [
    '2',
    'Get a scored plan',
    'Every recipe is scored across diet, goal, budget, prep time, pantry overlap, and cuisine while excluding allergens.',
  ],
  [
    '3',
    'Shop only what you need',
    'Ingredients are combined across meals and your current pantry stock is subtracted automatically.',
  ],
];

const FEATURES = [
  [
    '🎯',
    'Personalized scoring',
    'A clear 100-point scoring system ranks every recipe for your profile.',
  ],
  [
    '🛒',
    'Smart grocery list',
    'Duplicates merged, units converted, pantry deducted, and grouped by category.',
  ],
  [
    '💰',
    'Budget guard',
    'Over budget? Review cheaper swaps you can apply in a single click.',
  ],
  [
    '🥫',
    'Pantry tracking',
    'Low-stock and expiry alerts, plus higher scores for recipes using what you own.',
  ],
  [
    '📊',
    'Nutrition insights',
    'Calories, protein, carbs, and fats charted directly from your meal plans.',
  ],
  [
    '🤖',
    'Smart meal assistant',
    'Ask what you can cook with the ingredients in your kitchen and your target budget.',
  ],
];

const QUOTES = [
  [
    'Aarav S.',
    'Engineering student',
    'My weekly grocery bill dropped by a third and I finally hit my daily protein target.',
  ],
  [
    'Simran K.',
    'Working professional',
    'The pantry subtraction is a lifesaver — no more buying extra packets of rice I already have.',
  ],
  [
    'Rohit M.',
    'Gym beginner',
    'Muscle-gain meal plans that are vegetarian, practical, and affordable.',
  ],
];

const PREVIEW_MEALS = [
  ['🥣', 'Moong Dal Chilla', '₹30'],
  ['🍛', 'Rajma Chawal', '₹55'],
  ['🥜', 'Sprouts Salad', '₹20'],
  ['🍲', 'Palak Paneer + Roti', '₹105'],
];

export default function Landing() {
  const { user } = useAuth();
  const ctaPath = user ? '/app/planner' : '/register';

  return (
    <div>
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <span className="font-display text-xl font-bold text-leaf-700">
          🥗 FitPlate
        </span>
        <div className="flex items-center gap-2 text-sm">
          <a href="#features" className="hidden px-3 sm:block">
            Features
          </a>
          <a href="#grocery" className="hidden px-3 sm:block">
            Smart Grocery
          </a>
          {user ? (
            <Link
              className="btn-primary"
              to={user.role === 'admin' ? '/admin' : '/app/dashboard'}
            >
              Open app
            </Link>
          ) : (
            <>
              <Link className="btn-ghost" to="/login">
                Log in
              </Link>
              <Link className="btn-primary" to="/register">
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>

      <header className="relative overflow-hidden bg-gradient-to-br from-leaf-100 via-leaf-50 to-tang-100">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="badge mb-4">🌿 Meal planning for Indian kitchens</span>
            <h1 className="font-display text-4xl font-bold leading-tight sm:text-6xl">
              Eat Smarter. Plan Better.{' '}
              <span className="text-tang-600">Shop Smarter.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-stone-600">
              FitPlate creates personalized meal plans and automatically turns
              them into smart grocery lists based on your fitness goals,
              preferences, pantry, and budget.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={ctaPath} className="btn-primary px-6 py-3 text-base">
                Create My Meal Plan
              </Link>
              <Link to="/app/recipes" className="btn-ghost px-6 py-3 text-base">
                Explore Recipes
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <div className="card rotate-2 space-y-3 shadow-xl">
              <div className="text-xs font-bold uppercase text-stone-500">
                Today · 1,850 kcal · 98 g protein
              </div>
              {PREVIEW_MEALS.map(([emoji, name, cost]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-xl bg-leaf-50 px-3 py-2 text-sm"
                >
                  <span>
                    {emoji} {name}
                  </span>
                  <b>{cost}</b>
                </div>
              ))}
              <div className="rounded-xl bg-tang-100 px-3 py-2 text-sm font-semibold text-tang-600">
                Sample preview · Within your ₹250/day budget ✓
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center font-display text-3xl font-bold">
          How it works
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map(([num, title, desc]) => (
            <div key={num} className="card">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-leaf-600 font-bold text-white">
                {num}
              </div>
              <h3 className="font-display text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-stone-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center font-display text-3xl font-bold">
            Everything between “what to eat” and “what to buy”
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([icon, title, desc]) => (
              <div
                key={title}
                className="rounded-2xl border border-stone-200 p-5"
              >
                <div className="text-3xl">{icon}</div>
                <h3 className="mt-2 font-semibold">{title}</h3>
                <p className="text-sm text-stone-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="grocery"
        className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2"
      >
        <div>
          <span className="badge">Smart Grocery</span>
          <h2 className="mt-3 font-display text-3xl font-bold">
            Rice in three meals? One line on your list.
          </h2>
          <p className="mt-3 text-stone-600">
            The grocery engine reads your meal plan, merges repeated ingredients
            across days, converts units, subtracts what is already in your
            pantry, and prices only what remains.
          </p>
        </div>
        <div className="card font-mono text-sm">
          <div>
            Meals need: 200 g + 300 g + 250 g = <b>750 g rice</b>
          </div>
          <div>
            In pantry: <b>500 g</b>
          </div>
          <div className="mt-2 rounded-lg bg-leaf-100 p-2 text-leaf-800">
            Buy: <b>250 g rice</b> · ₹23
          </div>
        </div>
      </section>

      <section className="bg-leaf-900 py-16 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold">
              Nutrition you can see
            </h2>
            <p className="mt-3 text-leaf-100">
              Track calories, protein, carbs, and fats per day, and monitor
              weekly spending against your target budget from the plans you
              generate.
            </p>
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold">
              Budget optimization
            </h2>
            <p className="mt-3 text-leaf-100">
              If a meal plan goes over budget, FitPlate recommends lower-cost
              compatible replacements and updates your total immediately when
              you accept them.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center font-display text-3xl font-bold">
          Loved by everyday planners
        </h2>
        <p className="text-center text-xs text-stone-400">User highlights</p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {QUOTES.map(([name, role, quote]) => (
            <figure key={name} className="card">
              <blockquote className="text-sm text-stone-700">
                “{quote}”
              </blockquote>
              <figcaption className="mt-3 text-sm font-semibold">
                {name} <span className="font-normal text-stone-500">· {role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link to={ctaPath} className="btn-primary px-8 py-3 text-base">
            Create My Meal Plan
          </Link>
        </div>
      </section>

      <footer className="border-t bg-white py-8 text-center text-sm text-stone-500">
        © {new Date().getFullYear()} FitPlate · Intelligent Meal Planning &amp;
        Smart Grocery System
      </footer>
    </div>
  );
}
