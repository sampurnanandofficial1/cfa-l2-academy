const globals = require('globals');

module.exports = [
  {
    files: ['app.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser
    },
    rules: {
      'no-undef': 'error'
    }
  }
];
