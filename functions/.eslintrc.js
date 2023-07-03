module.exports = {
  ignorePatterns: [
    '/lib/**/*', // Ignore built files.
    '/node_modules/**/*', // Ignore built files.
  ],
  rules: {
    'no-param-reassign': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
  },
};
