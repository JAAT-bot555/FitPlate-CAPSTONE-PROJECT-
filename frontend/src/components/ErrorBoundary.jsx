import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="p-16 text-center">
        <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-stone-500">{this.state.error.message}</p>
        <button
          className="btn-primary mt-4"
          onClick={() => window.location.assign('/')}
        >
          Reload app
        </button>
      </div>
    );
  }
}
