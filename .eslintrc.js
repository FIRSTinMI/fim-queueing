module.exports = {
  root: true,
  env: {
    es6: true,
  },
  extends: [
    'airbnb',
    'airbnb-typescript',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.eslint.json'],
    sourceType: 'module',
  },
  ignorePatterns: [
    '/functions/lib/**/*',
    '/build/**/*',
    '**/node_modules',
  ],
  plugins: [
    '@typescript-eslint',
    'import',
  ],
  rules: {
    'no-console': 'off',
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        '': 'never',
        js: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never',
      },
    ],
  },
};

// {
//   'parser': '@typescript-eslint/parser',
//   'parserOptions': {
//     'project': './tsconfig.json'
//   },
//   'extends': [
//     'airbnb',
//     'airbnb-typescript'
//   ],
//   'ignorePatterns': [
//     'build/'
//   ],
//   'rules': {
//     'no-console': 'off',
//     'react/react-in-jsx-scope': 'off',
//     'react/jsx-one-expression-per-line': 'off',
//     'react/jsx-filename-extension': [
//       'error',
//       {
//         'extensions': [
//           '.jsx',
//           '.tsx'
//         ]
//       }
//     ],
//     'import/extensions': [
//       'error',
//       'ignorePackages',
//       {
//         '': 'never',
//         'js': 'never',
//         'jsx': 'never',
//         'ts': 'never',
//         'tsx': 'never'
//       }
//     ],
//     '@typescript-eslint/no-unused-vars': [
//       'error',
//       {
//         'argsIgnorePattern': '^_',
//         'varsIgnorePattern': '^_',
//         'caughtErrorsIgnorePattern': '^_'
//       }
//     ],
//     '@typescript-eslint/naming-convention': [
//       'error',
//       {
//         'selector': 'default',
//         'format': [
//           'camelCase',
//           'PascalCase',
//           'UPPER_CASE'
//         ],
//         'leadingUnderscore': 'allow'
//       }
//     ]
//   },
//   'settings': {
//     'react': {
//       '//': 'This is just to make it not complain, obviously we aren't using React',
//       'version': '18.0.0'
//     }
//   }
// },
