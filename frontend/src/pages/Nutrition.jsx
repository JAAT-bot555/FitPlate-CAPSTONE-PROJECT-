import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
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

const CHART_COLORS = ['#3d9c33', '#fb7c14', '#5fb852'];

function ChartCard({ title, children }) {
  return (
    <div className="card">
      <h3 className="mb-3 font-semibold">{title}</h3>
      <div className="h-64">{children}</div>
    </div>
  );
}

export default function Nutrition() {
  const { data, loading, error, reload } = useFetch(() =>
    api.get('/dashboard')
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  if (!data.hasPlan) {
    return (
      <>
        <PageHeader title="Nutrition dashboard" />
        <Empty icon="📊" title="Nothing to chart yet">
          Charts are built from your generated meal plans.{' '}
          <Link className="font-semibold text-leaf-700" to="/app/planner">
            Create one →
          </Link>
        </Empty>
      </>
    );
  }

  const sumDaily = (key) =>
    data.dailyNutrition.reduce((sum, day) => sum + day[key], 0);

  return (
    <div>
      <PageHeader
        title="Nutrition dashboard"
        sub="Based on your latest meal plan and past spending."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total calories"
          value={sumDaily('calories').toLocaleString('en-IN')}
        />
        <Stat label="Protein" value={`${sumDaily('protein')} g`} />
        <Stat
          label="Meals completed"
          value={`${data.mealsCompleted}/${data.mealsTotal}`}
        />
        <Stat label="Grocery cost" value={inr(data.groceryCost)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Daily calories & protein">
          <ResponsiveContainer>
            <BarChart data={data.dailyNutrition}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="calories"
                fill="#3d9c33"
                name="Calories (kcal)"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="protein"
                fill="#fb7c14"
                name="Protein (g)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Macro split (grams)">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data.macros}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                label
              >
                {data.macros.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % 3]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Carbs & fats per day">
          <ResponsiveContainer>
            <LineChart data={data.dailyNutrition}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="carbs"
                stroke="#3d9c33"
                name="Carbs (g)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="fats"
                stroke="#fb7c14"
                name="Fats (g)"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Spending per plan (₹)">
          <ResponsiveContainer>
            <BarChart data={data.spending}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip formatter={(value) => inr(value)} />
              <Legend />
              <Bar
                dataKey="meals"
                name="Meal cost"
                fill="#3d9c33"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="grocery"
                name="Grocery cost"
                fill="#fb7c14"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
