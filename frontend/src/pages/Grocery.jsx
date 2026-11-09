import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../services/api';
import useFetch from '../hooks/useFetch';
import { useUI } from '../context/UI';
import {
  Spinner,
  ErrorBox,
  Empty,
  PageHeader,
  fmtQty,
  inr,
} from '../components/common';

export default function Grocery() {
  const { toast, confirm } = useUI();
  const lists = useFetch(() => api.get('/grocery'));

  const [selectedId, setSelectedId] = useState(null);
  const [planBudget, setPlanBudget] = useState(null);

  useEffect(() => {
    if (
      lists.data?.length &&
      !lists.data.find((list) => list._id === selectedId)
    ) {
      setSelectedId(lists.data[0]._id);
    }
  }, [lists.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeList =
    lists.data?.find((list) => list._id === selectedId) || lists.data?.[0];

  useEffect(() => {
    setPlanBudget(null);
    if (activeList?.mealPlanId) {
      api
        .get(`/meal-plans/${activeList.mealPlanId}`)
        .then((res) => setPlanBudget(res.data))
        .catch(() => {});
    }
  }, [activeList?.mealPlanId]);

  const groupedItems = useMemo(() => {
    return (activeList?.items || []).reduce((groups, item, index) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push({ ...item, idx: index });
      return groups;
    }, {});
  }, [activeList]);

  if (lists.loading) return <Spinner />;
  if (lists.error) return <ErrorBox error={lists.error} onRetry={lists.reload} />;

  if (!lists.data.length) {
    return (
      <>
        <PageHeader title="Grocery list" />
        <Empty icon="🛒" title="No grocery list yet">
          Generate one from a meal plan.{' '}
          <Link className="font-semibold text-leaf-700" to="/app/planner">
            Open planner →
          </Link>
        </Empty>
      </>
    );
  }

  const handleToggleItem = async (idx, purchased) => {
    try {
      const res = await api.patch(`/grocery/${activeList._id}/items/${idx}`, {
        purchased,
      });
      lists.setData((prevLists) =>
        prevLists.map((list) => (list._id === res.data._id ? res.data : list))
      );
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const handleDeleteList = async () => {
    if (!(await confirm('Delete this grocery list?'))) {
      return;
    }
    try {
      await api.delete(`/grocery/${activeList._id}`);
      toast('Deleted');
      lists.reload();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const purchasedCost = activeList.items
    .filter((item) => item.purchased)
    .reduce((sum, item) => sum + item.estimatedCost, 0);

  const overBudget =
    planBudget && activeList.totalEstimatedCost > planBudget.budget;

  return (
    <div>
      <PageHeader
        title="Smart grocery list"
        sub="Merged across meals, pantry already subtracted."
      >
        <button className="btn-ghost no-print" onClick={() => window.print()}>
          🖨 Print
        </button>
        <button className="btn-ghost no-print" onClick={handleDeleteList}>
          🗑 Delete
        </button>
      </PageHeader>

      <select
        className="input no-print mb-4 max-w-xs"
        value={selectedId || ''}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        {lists.data.map((list) => (
          <option key={list._id} value={list._id}>
            {new Date(list.createdAt).toLocaleString('en-IN')} ·{' '}
            {inr(list.totalEstimatedCost)}
          </option>
        ))}
      </select>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="card py-3">
          <div className="text-xs uppercase text-stone-500">Estimated total</div>
          <div
            className={`font-display text-2xl font-bold ${
              overBudget ? 'text-red-600' : ''
            }`}
          >
            {inr(activeList.totalEstimatedCost)}
          </div>
        </div>
        <div className="card py-3">
          <div className="text-xs uppercase text-stone-500">
            Purchased so far
          </div>
          <div className="font-display text-2xl font-bold">
            {inr(purchasedCost)}
          </div>
        </div>
        <div className="card py-3">
          <div className="text-xs uppercase text-stone-500">Plan budget</div>
          <div className="font-display text-2xl font-bold">
            {planBudget ? inr(planBudget.budget) : '—'}
          </div>
        </div>
      </div>

      {overBudget && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          ⚠️ Grocery cost exceeds the plan budget. Try cheaper swaps in the{' '}
          <Link className="font-semibold underline" to="/app/planner">
            planner
          </Link>
          .
        </div>
      )}

      {!activeList.items.length ? (
        <Empty icon="🎉" title="Nothing to buy">
          Your pantry covers every ingredient in this plan.
        </Empty>
      ) : (
        Object.entries(groupedItems)
          .sort()
          .map(([category, items]) => (
            <div key={category} className="mb-4">
              <h3 className="mb-2 font-display text-lg font-bold">
                {category}
              </h3>
              <div className="card divide-y p-0">
                {items.map((item) => (
                  <label
                    key={item.idx}
                    className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-leaf-600"
                      checked={Boolean(item.purchased)}
                      onChange={(e) =>
                        handleToggleItem(item.idx, e.target.checked)
                      }
                    />
                    <span
                      className={`flex-1 capitalize ${
                        item.purchased ? 'text-stone-400 line-through' : ''
                      }`}
                    >
                      {item.name}
                      {item.required !== item.quantity && (
                        <span className="ml-2 text-xs text-stone-400">
                          (need {fmtQty(item.required, item.unit)}, have{' '}
                          {fmtQty(item.required - item.quantity, item.unit)})
                        </span>
                      )}
                    </span>
                    <b className="w-24 text-right">
                      {fmtQty(item.quantity, item.unit)}
                    </b>
                    <span className="w-16 text-right text-stone-500">
                      {inr(item.estimatedCost)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))
      )}
    </div>
  );
}
