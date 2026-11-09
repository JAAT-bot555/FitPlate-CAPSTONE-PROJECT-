// UI integration test: renders the real app and drives it against a live backend (seeded DB) on :5000.
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { AuthProvider } from '../context/Auth';
import { UIProvider } from '../context/UI';

const mount = path => render(<MemoryRouter initialEntries={[path]}><UIProvider><AuthProvider><App /></AuthProvider></UIProvider></MemoryRouter>);
const find = (t, o) => screen.findByText(t, o, { timeout: 15000 });
const goto = async name => { fireEvent.click((await screen.findAllByRole('link', { name: new RegExp(name) }))[0]); };
const login = async which => { fireEvent.click(await screen.findByText(which === 'admin' ? 'Fill demo admin' : 'Fill demo user')); fireEvent.click(screen.getByRole('button', { name: 'Log in' })); };
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const resetDemo = async () => {
  const response = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'demo@fitplate.com', password: 'Demo@12345' }) });
  if (!response.ok) throw new Error('Could not log in to reset demo test data');
  const { token } = await response.json(), headers = { authorization: `Bearer ${token}` };
  const request = async (path, method = 'GET', body) => {
    const result = await fetch(`${API_URL}${path}`, { method, headers: { ...headers, ...(body && { 'content-type': 'application/json' }) }, ...(body && { body: JSON.stringify(body) }) });
    if (!result.ok) throw new Error(`Could not reset demo test data: ${method} ${path} returned ${result.status}`);
    return result.status === 204 ? null : result.json();
  };
  const [plans, pantry, favorites, tracker] = await Promise.all([
    request('/meal-plans'), request('/pantry'), request('/favorites'),
    request('/tracker?from=2000-01-01&to=2099-12-31'),
  ]);
  await Promise.all([
    ...plans.map(plan => request(`/meal-plans/${plan._id}`, 'DELETE')),
    ...pantry.map(item => request(`/pantry/${item._id}`, 'DELETE')),
    ...favorites.filter(item => item.recipeId).map(item => request(`/favorites/${item.recipeId._id}`, 'DELETE')),
    ...tracker.foodLogs.map(item => request(`/tracker/foods/${item._id}`, 'DELETE')),
    ...tracker.bodyMetrics.map(item => request(`/tracker/body/${item._id}`, 'DELETE')),
    request('/users/profile', 'PUT', { name: 'Demo User' }),
  ]);
};
beforeEach(() => { cleanup(); localStorage.clear(); });

describe('FitPlate UI against live API', () => {
  it('guards, login errors, user journey', async () => {
    mount('/app/dashboard'); await find('Welcome back');                                   // protected route redirects
    fireEvent.change(screen.getByLabelText?.('Email') ?? document.querySelector('input[type=email]'), { target: { value: 'demo@fitplate.com' } });
    fireEvent.change(document.querySelector('input[type=password]'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' })); await find('Invalid email or password');
    await resetDemo();
    await login('user'); await find(/Hello, Demo/); await find('No meal plan yet');

    await goto('Meal Planner');
    const mealButtons = ['breakfast', 'lunch', 'snack', 'dinner'].map(slot => screen.getByRole('button', { name: new RegExp(slot) }));
    mealButtons.forEach(button => fireEvent.click(button));
    mealButtons.forEach(button => expect(button.className).not.toContain('border-leaf-600'));
    fireEvent.click(screen.getByRole('button', { name: /Generate plan/ })); await find('Select at least one meal per day');
    mealButtons.forEach(button => fireEvent.click(button));
    mealButtons.forEach(button => expect(button.className).toContain('border-leaf-600'));
    fireEvent.click(screen.getByRole('button', { name: /Generate plan/ }));
    await find('Day 1'); await find('Day 3'); expect(document.body.textContent).toMatch(/Est\. cost/);
    const before = document.body.textContent;
    fireEvent.click(screen.getAllByText('Replace')[0]); fireEvent.click((await screen.findAllByText('Use this'))[0]);
    await find('Meal replaced'); expect(document.body.textContent).not.toBe(before);
    fireEvent.click(screen.getAllByLabelText(/Mark .* completed/)[0]);

    fireEvent.click(screen.getByRole('button', { name: /Generate grocery list/ })); await find('Smart grocery list'); await find(/Estimated total/);
    const boxes = await screen.findAllByRole('checkbox'); fireEvent.click(boxes[0]); await waitFor(() => expect(boxes[0].checked).toBe(true));

    await goto('Pantry'); await find('Your pantry is empty');
    fireEvent.change(screen.getByPlaceholderText('e.g. rice'), { target: { value: 'rice' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Add' })); await find('Quantity must be greater than 0');   // validation
    fireEvent.change(document.querySelector('input[type=number]'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Add' })); await find('Added to pantry'); await find(/50 g/); await find('Low stock');
    fireEvent.click(screen.getByText('Edit')); fireEvent.change(document.querySelectorAll('input[type=number]')[1], { target: { value: '900' } }); fireEvent.click(screen.getByText('Save')); await find(/900 g/);
    fireEvent.click(screen.getByText('Delete')); fireEvent.click(await screen.findByText('Confirm')); await find('Your pantry is empty');

    await goto('Recipes'); await find(/recipes$/); await screen.findAllByLabelText('Toggle favorite'); fireEvent.click(screen.getAllByLabelText('Toggle favorite')[0]); await find('Saved to favorites');
    fireEvent.change(screen.getByPlaceholderText(/Search recipes/), { target: { value: 'zzzz' } }); await find('No recipes match');
    await goto('Favorites'); await find('1 saved');
    await goto('Nutrition'); await find('Daily calories & protein'); await find('Macro split (grams)');
    await goto('Food & Body Tracker'); await find('Food & body tracker');
    fireEvent.click(screen.getByRole('button', { name: 'Add food' })); await find('Food added to your log');
    fireEvent.change(screen.getByLabelText('Weight (kg) *'), { target: { value: '68.5' } });
    fireEvent.change(screen.getByLabelText('Muscle mass (kg)'), { target: { value: '29.2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save measurements' })); await find('Body measurement saved'); await find('68.5 kg');
    await find('Calories eaten');
    fireEvent.click(screen.getByRole('button', { name: /Remove measurement from/ })); await find('Measurement removed');
    fireEvent.click(screen.getByRole('button', { name: /Remove Aloo Paratha with Curd/ })); await find('Food entry removed');
    await goto('AI Assistant'); fireEvent.click(await screen.findByText(/high-protein vegetarian dinner under/)); await find(/recipes that match/);
    await goto('Profile'); fireEvent.change(screen.getByDisplayValue('Demo User'), { target: { value: 'Demo Tester' } }); fireEvent.click(screen.getByRole('button', { name: 'Save profile' })); await find('Profile saved');
  });
  it('admin: RBAC and recipe CRUD through UI', async () => {
    mount('/login'); await login('admin'); await find('Admin overview'); await find('Users', { selector: 'div' });
    await goto('Recipes'); await find('+ Add recipe'); fireEvent.click(screen.getByText('+ Add recipe'));
    const modal = (await find('Add recipe', { selector: 'h3' })).closest('.card');
    fireEvent.click(within(modal).getByRole('button', { name: 'Save' })); await find('Name is required');
    fireEvent.change(within(modal).getAllByRole('textbox')[0], { target: { value: 'UI Test Dish' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Save' })); await find('Recipe added');
    fireEvent.change(screen.getByPlaceholderText(/Search recipes/), { target: { value: 'UI Test' } }); await find('UI Test Dish');
    fireEvent.click(screen.getByText('Delete')); fireEvent.click(await screen.findByText('Confirm')); await find('Recipe deleted');
    await goto('Ingredients'); await find('Ingredients & categories'); await find('paneer');
  });
  it('non-admin cannot open admin panel', async () => {
    mount('/admin'); await find('Welcome back'); await login('user');   // redirected to login, then blocked from /admin
    await find(/Hello, Demo/); expect(screen.queryByText('Admin overview')).toBeNull();
  });
});
