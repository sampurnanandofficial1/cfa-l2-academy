const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync('index.html', 'utf8');
const appSource = fs.readFileSync('app.js', 'utf8');
const virtualConsole = new VirtualConsole();
const consoleErrors = [];
virtualConsole.on('jsdomError', err => consoleErrors.push(err.message));
const dom = new JSDOM(html, {
  url: 'https://academy.example.test/cfa-l2-academy/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  virtualConsole
});
const { window } = dom;
window.scrollTo = () => {};
window.confirm = () => true;
window.alert = () => {};
window.prompt = () => '10';
const runtimeErrors = [];
window.addEventListener('error', event => runtimeErrors.push(String(event.message || event.error)));
window.addEventListener('unhandledrejection', event => runtimeErrors.push(String(event.reason)));
vm.runInContext(appSource, dom.getInternalVMContext(), { filename: 'app.js' });

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const click = selector => {
  const node = window.document.querySelector(selector);
  assert(node, 'Element not found for click: ' + selector);
  node.click();
};
const visibleText = () => window.document.getElementById('app').textContent || '';

(async () => {
  await wait(80);
  assert(window.document.querySelector('.app-shell'), 'App shell did not render after startup.');
  assert(!visibleText().includes('Dashboard could not render'), 'App rendered its fatal-error fallback.');

  const pages = [
    ['dashboard', 'Overview'], ['learn', 'Learn'], ['curriculum', 'Curriculum Explorer'],
    ['questions', 'Question Bank'], ['practice', 'Practice Session'],
    ['itemset', 'Item-Set Practice'], ['mock', 'Mock Exams'],
    ['formulas', 'Formula Library'], ['flashcards', 'Flashcards'],
    ['revision', 'Revision Centre'], ['analytics', 'Performance Analytics'],
    ['notes', 'Bookmarks & Notes'], ['source', 'Source Import'],
    ['questionbuilder', 'Question Builder'], ['settings', 'Profile & Settings']
  ];
  for (const [page, title] of pages) {
    click('[data-action="nav"][data-page="' + page + '"]');
    await wait(0);
    const actual = window.document.querySelector('.page-title')?.textContent?.trim();
    assert(actual === title, 'Navigation failed for ' + page + ': expected "' + title + '", got "' + actual + '".');
    assert(!visibleText().includes('Dashboard could not render'), 'Runtime render failure on page ' + page + '.');
  }

  click('[data-action="nav"][data-page="practice"]');
  const answer = window.document.querySelector('input[name="answer"]');
  assert(answer, 'Practice answer choices did not render.');
  answer.click();
  click('[data-action="submit-answer"]');
  assert(window.document.querySelector('.feedback-card'), 'Practice submit did not show feedback.');

  click('[data-action="theme"]');
  assert(window.document.body.classList.contains('light-mode'), 'Theme button did not switch to light mode.');
  click('[data-action="theme"]');
  assert(!window.document.body.classList.contains('light-mode'), 'Theme button did not switch back to dark mode.');

  click('[data-action="nav"][data-page="settings"]');
  const goal = window.document.getElementById('dailyGoal');
  assert(goal, 'Study goal field not rendered.');
  goal.value = '60';
  click('[data-action="save-settings"]');
  const stored = JSON.parse(window.localStorage.getItem('cfa-equity-academy:v1'));
  assert(stored.profiles[stored.activeProfile].dailyGoal === 60, 'Save preferences button did not persist the daily goal.');

  click('[data-action="nav"][data-page="flashcards"]');
  click('[data-action="flash-reveal"]');
  click('[data-action="flash-next"]');
  click('[data-action="nav"][data-page="notes"]');
  const titleField = window.document.getElementById('noteTitle');
  if (titleField) {
    titleField.value = 'Smoke test note';
    window.document.getElementById('noteText').value = 'Saved by UI smoke test.';
    window.document.getElementById('noteForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    assert(visibleText().includes('Smoke test note'), 'Notes form did not save a note.');
  }

  assert(runtimeErrors.length === 0, 'Runtime errors: ' + runtimeErrors.join(' | '));
  assert(consoleErrors.length === 0, 'DOM/browser errors: ' + consoleErrors.join(' | '));
  console.log('UI smoke test passed: startup, 15 navigation pages, practice answer submission, theme toggle, settings persistence, flashcards and notes.');
  dom.window.close();
})().catch(error => {
  console.error(error.stack || error);
  dom.window.close();
  process.exitCode = 1;
});
