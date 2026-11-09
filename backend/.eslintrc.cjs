module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
  },
  extends: ['eslint:recommended'],
  ignorePatterns: ['node_modules'],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^(next|req|res)$' }],
  },
};
