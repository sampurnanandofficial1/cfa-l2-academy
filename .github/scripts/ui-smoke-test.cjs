const fs = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync('index.html', 'utf8');
const appSource = fs.readFileSync('app.js', 'utf8');

const actionNames = [...new Set([...appSource.matchAll(/data-action=["']([^"']+)["']/g)].map(match => match[1]))];
const handledActions = new Set([...appSource.matchAll(/\ba===['"]([^'"]+)['"]/g)].map(match => match[1]));
for (const action of actionNames) {
  if (!handledActions.has(action)) throw new Error('Rendered action has no click handler: ' + action);
}
const starterQuestionRows = appSource.split('\n').filter(line => /^\s*\{id:'q\d+'/.test(line));
if (starterQuestionRows.length !== 16) throw new Error('Expected 16 starter questions; found ' + starterQuestionRows.length);
for (const line of starterQuestionRows) {
  const id = line.match(/id:'(q\d+)'/)?.[1];
  const correct = line.match(/correct:'([A-Z])'/)?.[1];
  const optionText = (line.match(/options:\[(.*?)\],correct:/) || [])[1] || '';
  const options = [...optionText.matchAll(/key:'([A-Z])',text:'([^']*)'/g)].map(m => ({ key: m[1], text: m[2] }));
  const rationaleText = (line.match(/rationales:\[(.*?)\],trap:/) || [])[1] || '';
  const rationales = [...rationaleText.matchAll(/\{key:'([A-Z])',text:'([^']*)'\}/g)].map(m => ({ key: m[1], text: m[2] }));
  if (!options.some(option => option.key === correct)) throw new Error(id + ': answer key has no matching option.');
  const correctRationale = rationales.find(rationale => rationale.key === correct);
  if (!correctRationale || !/^Correct\b/i.test(correctRationale.text)) throw new Error(id + ': correct answer rationale is missing or contradicts its key.');
  if (rationales.some(rationale => rationale.key !== correct && /^Correct\b/i.test(rationale.text))) throw new Error(id + ': a distractor rationale is labelled correct.');
}
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
window.eval(appSource);

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
    ['dashboard', 'Overview'], ['subjects', 'All 10 Subjects'], ['resources', 'SSEI & Study Resources'],
    ['learn', 'Equity Study Guides'], ['curriculum', 'Equity Curriculum Explorer'],
    ['questions', 'Equity Question Bank'], ['practice', 'Equity Practice'],
    ['itemset', 'Equity Item-Set Practice'], ['mock', 'Equity Mock Exams'],
    ['formulas', 'Formula Library'], ['flashcards', 'Flashcards'],
    ['revision', 'Revision Centre'], ['analytics', 'Performance Analytics'],
    ['notes', 'Bookmarks & Notes'], ['source', 'Equity Source Import'],
    ['questionbuilder', 'Question Builder'], ['settings', 'Profile & Settings']
  ];
  for (const [page, title] of pages) {
    click('[data-action="nav"][data-page="' + page + '"]');
    await wait(0);
    const actual = window.document.querySelector('.page-title')?.textContent?.trim();
    assert(actual === title, 'Navigation failed for ' + page + ': expected "' + title + '", got "' + actual + '".');
    assert(!visibleText().includes('Dashboard could not render'), 'Runtime render failure on page ' + page + '.');
  }


  click('[data-action="nav"][data-page="subjects"]');
  assert(window.document.querySelectorAll('.subject-card').length === 10, 'Subject explorer must render all ten Level II topics.');
  const topicStatus = window.document.querySelector('[data-topic-status="quantitative"]');
  assert(topicStatus, 'Quantitative Methods status selector is missing.');
  topicStatus.value = 'in-progress';
  topicStatus.dispatchEvent(new window.Event('change', { bubbles: true }));
  const topicState = JSON.parse(window.localStorage.getItem('cfa-equity-academy:v1'));
  assert(topicState.profiles[topicState.activeProfile].topicStatus.quantitative === 'in-progress',
    'Subject status was not persisted for the active learner.');
  click('[data-action="subject-detail"][data-subject="equity"]');
  assert(window.document.querySelector('.page-title')?.textContent?.trim() === 'Equity Valuation Plan',
    'Opening a subject plan did not render the selected subject.');
  click('[data-action="nav"][data-page="resources"]');
  assert(visibleText().includes('FROM SSEI') && visibleText().includes('Additional Practice Questions'),
    'SSEI materials page must show both source-labeled resources.');
  assert(window.document.querySelectorAll('input[data-material-key]').length === 2,
    'SSEI material upload controls are missing.');

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


  click('[data-action="nav"][data-page="formulas"]');
  click('[data-action="formula-to-note"]');
  const afterFormula = JSON.parse(window.localStorage.getItem('cfa-equity-academy:v1'));
  assert(afterFormula.profiles[afterFormula.activeProfile].notes.some(note => note.title === 'Gordon growth model'),
    'Add formula to notes action did not persist a note.');

  click('[data-action="nav"][data-page="itemset"]');
  const itemSetQuestion = window.document.querySelector('[data-action="open-question"][data-qid]');
  assert(itemSetQuestion, 'Item-set practice did not provide a working question entry.');
  itemSetQuestion.click();
  assert(window.document.querySelector('.question-heading'), 'Opening an item-set question did not open practice.');

  click('[data-action="nav"][data-page="mock"]');
  const mockForm = window.document.getElementById('mockForm');
  assert(mockForm, 'Mock exam setup form did not render.');
  mockForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert(window.document.getElementById('examClock'), 'Starting a mock did not open the timed exam or start its clock.');
  for (let i = 0; i < 9; i++) click('[data-action="exam-next"]');
  click('[data-action="exam-finish"]');
  assert(visibleText().includes('Question-by-question review'), 'Submitting the mock did not render the review/results screen.');
  click('[data-action="new-mock"]');
  assert(window.document.getElementById('mockForm'), 'Create another mock did not return to setup.');

  assert(runtimeErrors.length === 0, 'Runtime errors: ' + runtimeErrors.join(' | '));
  assert(consoleErrors.length === 0, 'DOM/browser errors: ' + consoleErrors.join(' | '));
  console.log('UI smoke test passed: startup, 17 navigation pages, all ten subject cards, subject status persistence, SSEI resource cards, Equity practice, mocks, themes, settings, notes and flashcards.');
  dom.window.close();
})().catch(error => {
  console.error(error.stack || error);
  dom.window.close();
  process.exitCode = 1;
});
