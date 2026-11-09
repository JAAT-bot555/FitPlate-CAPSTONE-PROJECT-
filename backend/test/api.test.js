// Integration test. Needs a running MongoDB-compatible server: MONGO_URI=... JWT_SECRET=... npm test
const test = require('node:test'), assert = require('node:assert'), { execSync } = require('node:child_process');
const skip = !process.env.MONGO_URI || !process.env.JWT_SECRET;
test('API workflows', { skip: skip && 'MONGO_URI/JWT_SECRET not set' }, async t => {
  execSync('node seed/seed.js', { stdio: 'pipe' });
  const mongoose = require('mongoose'); await mongoose.connect(process.env.MONGO_URI);
  const { User } = require('../models');
  await User.deleteOne({ email: 'qa@test.com' });
  const srv = require('../app').listen(0); const base = `http://127.0.0.1:${srv.address().port}/api`;
  const call = async (m, p, b, tok) => { const r = await fetch(base + p, { method: m, headers: { 'content-type': 'application/json', ...(tok && { authorization: 'Bearer ' + tok }) }, body: b && JSON.stringify(b) }); let j = null; try { j = await r.json(); } catch { j = null; } return { s: r.status, j }; };
  let tok, plan, admin;
  await t.test('auth: validation, register, duplicate, login, me, protected', async () => {
    assert.equal((await call('POST', '/auth/register', { name: 'a', email: 'bad', password: '12345678' })).s, 400);
    assert.equal((await call('POST', '/auth/register', { name: 'a', email: 'qa@test.com', password: '123' })).s, 400);
    const r = await call('POST', '/auth/register', { name: 'QA', email: 'qa@test.com', password: 'Passw0rd!', dietaryPreference: 'vegetarian', allergies: ['peanut'], budget: 1500, role: 'admin' });
    assert.equal(r.s, 201); assert.equal(r.j.user.role, 'user', 'role escalation blocked'); assert.equal(r.j.user.password, undefined);
    assert.equal((await call('POST', '/auth/register', { name: 'QA', email: 'qa@test.com', password: 'Passw0rd!' })).s, 409);
    assert.equal((await call('POST', '/auth/login', { email: 'qa@test.com', password: 'wrong' })).s, 401);
    tok = (await call('POST', '/auth/login', { email: 'qa@test.com', password: 'Passw0rd!' })).j.token;
    assert.equal((await call('GET', '/auth/me', null, tok)).j.email, 'qa@test.com');
    assert.equal((await call('GET', '/auth/me')).s, 401); assert.equal((await call('GET', '/recipes', null, 'junk')).s, 401);
  });
  await t.test('recipes: seeded >=40, search/filter/sort', async () => {
    const all = await call('GET', '/recipes?limit=100', null, tok); assert.ok(all.j.total >= 40);
    assert.ok((await call('GET', '/recipes?q=paneer', null, tok)).j.items.every(r => /paneer/i.test(r.name)));
    const s = (await call('GET', '/recipes?sort=cost&category=lunch', null, tok)).j.items; assert.ok(s[0].estimatedCost <= s[s.length - 1].estimatedCost);
    assert.equal((await call('GET', '/recipes/not-an-id', null, tok)).s, 400);
  });
  await t.test('tracker: recipe food logs, nutrition totals, body measurements and ownership', async () => {
    const recipe = (await call('GET', '/recipes?limit=1', null, tok)).j.items[0];
    const food = await call('POST', '/tracker/foods', { recipeId: recipe._id, date: '2026-10-08', category: 'breakfast', servings: 1.5 }, tok);
    assert.equal(food.s, 201);
    assert.equal(food.j.calories, Math.round(recipe.calories * 1.5 * 10) / 10);
    assert.equal((await call('POST', '/tracker/foods', { recipeId: recipe._id, date: 'bad', category: 'breakfast', servings: 1 }, tok)).s, 400);
    assert.equal((await call('POST', '/tracker/foods', { recipeId: recipe._id, date: '2026-10-08', category: 'breakfast', servings: 0 }, tok)).s, 400);
    const metric = await call('POST', '/tracker/body', { date: '2026-10-08', weightKg: 72.4, muscleMassKg: 31.2, bodyFatPct: 19.5, waistCm: 82 }, tok);
    assert.equal(metric.s, 201);
    assert.equal((await call('POST', '/tracker/body', { date: '2026-10-08', weightKg: 0 }, tok)).s, 400);
    const data = await call('GET', '/tracker?from=2026-10-08&to=2026-10-08', null, tok);
    assert.equal(data.s, 200); assert.equal(data.j.foodLogs.length, 1); assert.equal(data.j.bodyMetrics.length, 1);
    const other = (await call('POST', '/auth/register', { name: 'Other', email: 'qa2@test.com', password: 'Passw0rd!' })).j.token;
    assert.equal((await call('GET', '/tracker?from=2026-10-08&to=2026-10-08', null, other)).j.foodLogs.length, 0);
    assert.equal((await call('DELETE', `/tracker/foods/${food.j._id}`, null, other)).s, 404);
    assert.equal((await call('DELETE', `/tracker/foods/${food.j._id}`, null, tok)).s, 204);
    assert.equal((await call('DELETE', `/tracker/body/${metric.j._id}`, null, tok)).s, 204);
    const { User } = require('../models'); await User.deleteOne({ email: 'qa2@test.com' });
  });
  await t.test('meal plan respects diet + allergy; pantry; grocery combine & subtract', async () => {
    const r = await call('POST', '/meal-plans/generate', { days: 3, budget: 1500 }, tok); assert.equal(r.s, 201); plan = r.j;
    assert.equal(plan.days.length, 3); assert.equal(plan.days[0].meals.length, 4);
    for (const m of plan.days.flatMap(d => d.meals)) { assert.ok(m.recipe.dietaryTags.includes('vegetarian')); assert.ok(!m.recipe.ingredients.some(i => /peanut/.test(i.name))); }
    const g1 = (await call('POST', '/grocery/generate', { mealPlanId: plan._id }, tok)).j;
    const need = {}; for (const m of plan.days.flatMap(d => d.meals)) for (const i of m.recipe.ingredients) { const k = i.name + '|' + i.unit; need[k] = (need[k] || 0) + i.quantity; }
    const gi = g1.items.find(i => i.unit === 'g' && need[i.name + '|g'] >= 200); assert.ok(gi); assert.equal(gi.required, need[gi.name + '|g']);
    assert.equal(new Set(g1.items.map(i => i.name + i.unit)).size, g1.items.length, 'no duplicates');
    const p = await call('POST', '/pantry', { ingredient: gi.name, quantity: 100, unit: 'g' }, tok); assert.equal(p.s, 201);
    assert.equal((await call('POST', '/pantry', { ingredient: '', quantity: 1 }, tok)).s, 400);
    const g2 = (await call('POST', '/grocery/generate', { mealPlanId: plan._id }, tok)).j;
    assert.equal(g2.items.find(i => i.name === gi.name).quantity, gi.quantity - 100, 'pantry deducted');
    await call('PUT', '/pantry/' + p.j._id, { quantity: 100000 }, tok);
    const g3 = (await call('POST', '/grocery/generate', { mealPlanId: plan._id }, tok)).j; assert.ok(!g3.items.find(i => i.name === gi.name), 'stocked item removed');
    await call('DELETE', '/pantry/' + p.j._id, null, tok);
    const tg = await call('PATCH', `/grocery/${g1._id}/items/0`, { purchased: true }, tok); assert.equal(tg.j.items[0].purchased, true);
  });
  await t.test('budget: overflow detected, suggestion accepted, total drops', async () => {
    const low = await call('POST', '/meal-plans/generate', { days: 2, budget: 100000 }, tok);
    const cost = low.j.estimatedCost; await mongoose.model('MealPlan').updateOne({ _id: low.j._id }, { budget: cost - 60 });
    const o = (await call('GET', `/meal-plans/${low.j._id}/optimize`, null, tok)).j;
    assert.equal(o.exceeded, true); assert.ok(o.suggestions.length > 0); assert.ok(o.newTotal < cost);
    const sg = o.suggestions[0], ac = await call('PATCH', `/meal-plans/${low.j._id}/replace`, { day: sg.day, slot: sg.slot, recipeId: sg.to.id }, tok);
    assert.equal(ac.s, 200); assert.equal(ac.j.estimatedCost, cost - sg.saving);
    const alt = await call('GET', `/meal-plans/${low.j._id}/alternatives?slot=lunch`, null, tok); assert.equal(alt.s, 200); assert.ok(alt.j.length > 0);
    assert.equal((await call('PATCH', `/meal-plans/${low.j._id}/complete`, { day: 1, slot: 'lunch', completed: true }, tok)).s, 200);
  });
  await t.test('dashboard uses real data; assistant works w/o API key; ownership isolation', async () => {
    const d = (await call('GET', '/dashboard', null, tok)).j; assert.ok(d.hasPlan); assert.ok(d.dailyNutrition.length > 0); assert.equal(d.mealsCompleted, 1); assert.ok(d.groceryCost > 0);
    const a = await call('POST', '/assistant', { message: 'I have paneer, rice and potato. High-protein dinner under ₹120' }, tok); assert.equal(a.s, 200); assert.ok(a.j.parsed.have.includes('paneer')); assert.ok(a.j.suggestions.every(s => s.cost <= 120));
    const o = (await call('POST', '/auth/register', { name: 'Other', email: 'qa2@test.com', password: 'Passw0rd!' })).j.token;
    assert.equal((await call('GET', '/meal-plans/' + plan._id, null, o)).s, 404); await User.deleteOne({ email: 'qa2@test.com' });
  });
  await t.test('admin: RBAC, recipe add/edit/delete, stats, users', async () => {
    assert.equal((await call('GET', '/admin/stats', null, tok)).s, 403);
    admin = (await call('POST', '/auth/login', { email: 'admin@fitplate.com', password: 'Admin@12345' })).j.token;
    const c = await call('POST', '/admin/recipes', { name: 'QA Dish', category: 'lunch', cuisine: 'Test', calories: 300, protein: 10, estimatedCost: 20, dietaryTags: ['vegetarian'], ingredients: [{ name: 'rice', quantity: 100, unit: 'g' }] }, admin); assert.equal(c.s, 201);
    assert.equal((await call('POST', '/admin/recipes', { name: 'x' }, admin)).s, 400);
    assert.equal((await call('PUT', '/admin/recipes/' + c.j._id, { estimatedCost: 25 }, admin)).j.estimatedCost, 25);
    assert.equal((await call('DELETE', '/admin/recipes/' + c.j._id, null, admin)).s, 204); assert.equal((await call('GET', '/recipes/' + c.j._id, null, tok)).s, 404);
    assert.ok((await call('GET', '/admin/stats', null, admin)).j.users >= 3); assert.ok((await call('GET', '/admin/users', null, admin)).j.length >= 3);
    assert.ok((await call('GET', '/admin/categories', null, admin)).j.length > 3); assert.equal((await call('GET', '/nope', null, tok)).s, 404);
  });
  srv.close(); await mongoose.disconnect();
});
