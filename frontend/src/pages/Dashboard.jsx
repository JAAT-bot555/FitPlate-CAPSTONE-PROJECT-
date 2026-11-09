import { Link } from 'react-router-dom';
import api from '../services/api';
import useFetch from '../hooks/useFetch';
import {
  Spinner,
  ErrorBox,
  Empty,
  PageHeader,
  Stat,
  inr,
} from '../components/common';
import { useAuth } from '../context/Auth';

const QUICK_LINKS = [
  ['/app/grocery', '🛒', 'Grocery list'],
  ['/app/nutrition', '📊', 'Nutrition charts'],
  ['/app/assistant', '🤖', 'Ask the AI assistant'],
];

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(() => api.get('/dashboard'));

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const avgCalories = data.dailyNutrition.length
    ? Math.round(
        data.dailyNutrition.reduce((sum, day) => sum + day.calories, 0) /
          data.dailyNutrition.length
      )
    : 0;

  const overBudget = data.hasPlan && data.budget && data.planCost > data.budget;
  const budgetPercent = data.budget
    ? Math.min(100, (data.planCost / data.budget) * 100)
    : 0;

  return (
    <div>
      <PageHeader
        title={`Hello, ${user.name.split(' ')[0]} 👋`}
        sub="Here is your nutrition and spending snapshot."
      >
        <Link to="/app/planner" className="btn-primary">
          + New meal plan
        </Link>
      </PageHeader>

      {!data.hasPlan ? (
        <Empty icon="📅" title="No meal plan yet">
          Generate your first plan from your profile, budget, and pantry.{' '}
          <Link className="font-semibold text-leaf-700" to="/app/planner">
            Open planner →
          </Link>
        </Empty>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Plan cost"
              value={inr(data.planCost)}
              sub={`Budget ${inr(data.budget)}`}
              tone={overBudget ? 'warn' : 'leaf'}
            />
            <Stat
              label="Avg calories / day"
              value={avgCalories}
              sub={`${user.fitnessGoal}`}
            />
            <Stat
              label="Meals completed"
              value={`${data.mealsCompleted}/${data.mealsTotal}`}
              sub="across all plans"
            />
            <Stat
              label="Latest grocery cost"
              value={inr(data.groceryCost)}
              sub={`${data.pantryCount} pantry items`}
            />
          </div>

          <div className="card mt-6">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-semibold">Budget used</span>
              <span className={overBudget ? 'font-semibold text-red-600' : ''}>
                {overBudget
                  ? '⚠️ Budget exceeded'
                  : `${Math.round(budgetPercent)}%`}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-stone-100">
              <div
                className={`h-full ${
                  overBudget ? 'bg-red-500' : 'bg-leaf-500'
                }`}
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
            {overBudget && (
              <Link
                to="/app/planner"
                className="mt-3 inline-block text-sm font-semibold text-leaf-700"
              >
                See cheaper alternatives →
              </Link>
            )}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {QUICK_LINKS.map(([to, icon, title]) => (
              <Link
                key={to}
                to={to}
                className="card text-center font-semibold hover:shadow-md"
              >
                <div className="text-3xl">{icon}</div>
                {title}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
