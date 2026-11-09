import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../services/api';
import { PageHeader, inr } from '../components/common';

const EXAMPLES = [
  'I have paneer, rice and potato. What can I cook?',
  'Create a high-protein vegetarian dinner under ₹100',
  'Cheap breakfast under ₹30',
];

export default function Assistant() {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [busy, setBusy] = useState(false);

  const handleSend = async (presetText) => {
    const query = (presetText ?? message).trim();
    if (!query || busy) return;

    setChatHistory((prev) => [...prev, { role: 'user', text: query }]);
    setMessage('');
    setBusy(true);

    try {
      const res = await api.post('/assistant', { message: query });
      setChatHistory((prev) => [...prev, { role: 'bot', ...res.data }]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'bot',
          reply: errMsg(err),
          suggestions: [],
          error: true,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="AI meal assistant"
        sub="Ask for recipe suggestions based on ingredients in your kitchen, protein targets, or your meal budget."
      />

      {!chatHistory.length && (
        <div className="mb-4 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              className="btn-ghost text-left"
              onClick={() => handleSend(example)}
            >
              {example}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {chatHistory.map((entry, idx) =>
          entry.role === 'user' ? (
            <div
              key={idx}
              className="ml-auto max-w-[85%] rounded-2xl bg-leaf-600 px-4 py-2 text-sm text-white"
            >
              {entry.text}
            </div>
          ) : (
            <div key={idx} className="max-w-full">
              <div
                className={`rounded-2xl border bg-white px-4 py-3 text-sm ${
                  entry.error ? 'border-red-200 text-red-700' : ''
                }`}
              >
                {entry.reply}
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(entry.suggestions || []).map((suggestion) => (
                  <Link
                    to={`/app/recipes/${suggestion.id}`}
                    key={suggestion.id}
                    className="card p-3 text-sm hover:shadow-md"
                  >
                    <b>{suggestion.name}</b>
                    <div className="text-xs text-stone-500">
                      {suggestion.category} · {suggestion.calories} kcal ·{' '}
                      {suggestion.protein} g · {inr(suggestion.cost)}
                    </div>
                    {suggestion.youHave.length > 0 && (
                      <div className="mt-1 text-xs text-leaf-700">
                        ✓ You have: {suggestion.youHave.join(', ')}
                      </div>
                    )}
                    {suggestion.youNeed.length > 0 && (
                      <div className="text-xs text-stone-500">
                        Need: {suggestion.youNeed.join(', ')}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )
        )}

        {busy && <div className="text-sm text-stone-500">Thinking…</div>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="sticky bottom-4 mt-6 flex gap-2"
      >
        <input
          className="input shadow"
          placeholder="Ask about ingredients, budget, protein…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button className="btn-primary" disabled={busy || !message.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
