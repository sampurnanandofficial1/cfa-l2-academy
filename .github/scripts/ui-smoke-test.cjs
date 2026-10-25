const fs = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync('index.html', 'utf8');
const appSource = fs.readFileSync('app.js', 'utf8');

const actionNames = [...new Set([...appSource.matchAll(/data-action=["']([^"']+)["']/g)].map(match => match[1]))];
const handledActions = new Set([...appSource.matchAll(/\ba===['"]([^'"]+)['"]/g)].map(match => match[1]));
for (const action of actionNames) {
  if (!handledActions.has(action)) throw new Error('Rendered action has no click handler: ' + action);
}

const questionRows = appSource.split('\n').filter(line => /^\s*\{id:'q\d+'/.test(line));
if (questionRows.length !== 60) throw new Error('Expected 60 total practice questions; found ' + questionRows.length);
for (const line of questionRows) {
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

const deepNotes = (appSource.match(/\{id:'deep-m[1-6]-\d+'/g) || []).length;
const visualMaps = (appSource.match(/\{id:'map-[^']+'/g) || []).length;
if (deepNotes !== 24) throw new Error('Expected 24 deeper source notes; found ' + deepNotes);
if (visualMaps !== 9) throw new Error('Expected nine visual memory maps; found ' + visualMaps);
if (!appSource.includes('function renderGordonSensitivityGraph') || !appSource.includes('function renderGrowthFadeGraph')) {
  throw new Error('The two illustrative learning graphs are missing.');
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
const nav = page => click('.sidebar .nav-item[data-page="' + page + '"]');

(async () => {
  await wait(80);
  assert(window.document.querySelector('.app-shell'), 'App shell did not render after startup.');
  assert(!visibleText().includes('Dashboard could not render'), 'App rendered its fatal-error fallback.');

  const pages = [
    ['dashboard', 'Overview'], ['learn', 'Learn'], ['practice', 'Practice'],
    ['formulas', 'Formula & Visual Maps'], ['revision', 'Review'],
    ['subjects', 'All Subjects'], ['settings', 'Settings']
  ];
  for (const [page, title] of pages) {
    nav(page);
    await wait(0);
    const actual = window.document.querySelector('.page-title')?.textContent?.trim();
    assert(actual === title, 'Navigation failed for ' + page + ': expected "' + title + '", got "' + actual + '".');
    assert(!visibleText().includes('Dashboard could not render'), 'Runtime render failure on page ' + page + '.');
  }

  nav('dashboard');
  assert(visibleText().includes('Learn the logic. See the map. Practise the decision.'),
    'Dashboard should present the focused three-step learning path.');
  assert([...window.document.querySelectorAll('.nav-item')].every(el => !/Equity/i.test(el.textContent)),
    'Left navigation should use common, subject-neutral labels.');
  assert(window.document.querySelectorAll('.primary-path-card').length === 3,
    'Dashboard should have three primary actions: Learn, Practice and Review.');
  assert(!window.document.querySelector('#app input[type="file"]'), 'Dashboard should not surface a PDF upload control.');
  assert(!window.document.querySelector('.sidebar [data-page="questions"]') &&
    !window.document.querySelector('.sidebar [data-page="itemset"]') &&
    !window.document.querySelector('.sidebar [data-page="mock"]'),
    'Detailed practice activities should be grouped behind the Practice hub.');

  nav('subjects');
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

  nav('learn');
  assert(window.document.querySelectorAll('.learning-module-card').length === 6, 'Learn page must render the six Equity learning modules.');
  assert(visibleText().includes('97 notes') || visibleText().includes('97 study notes') || visibleText().includes('97 curated topic notes'),
    'Learn page should report the comprehensive note catalogue.');
  click('[data-action="nav"][data-page="notes"]');
  assert(window.document.querySelectorAll('.study-note-card').length >= 90,
    'The main Notes page should include all source-derived, deeper and illustration notes.');
  assert(visibleText().includes('SSEI') && visibleText().includes('Curriculum'),
    'Notes must show inline source labels.');
  const noteSearch = window.document.getElementById('studyNoteSearch');
  assert(noteSearch, 'Study-notes search field is missing.');
  noteSearch.value = 'H-model';
  noteSearch.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert(visibleText().includes('H-model'), 'Notes search did not filter to a relevant concept.');
  const afterSearch = window.document.getElementById('studyNoteSearch');
  afterSearch.value = '';
  afterSearch.dispatchEvent(new window.Event('input', { bubbles: true }));
  click('[data-action="nav"][data-page="practice"]');

  click('[data-action="nav"][data-page="questions"]');
  assert(visibleText().includes('60 total available'), 'The question bank should contain 60 questions.');
  const builtInSets = [...window.document.querySelectorAll('.question-set-card')];
  assert(builtInSets.length === 11, 'The built-in 60-question bank should be grouped into 11 item sets.');
  for (const set of builtInSets) {
    assert(set.querySelectorAll('.itemset-passage-block').length === 1,
      'Each item set must show exactly one separate passage container: ' + set.querySelector('.card-title')?.textContent);
    assert(set.querySelectorAll('.itemset-questions-container').length === 1,
      'Each item set must show a separate related-questions container.');
    const rows = set.querySelectorAll('.itemset-questions-container .question-row').length;
    assert(rows >= 4 && rows <= 6, 'Each built-in item set must contain 4–6 linked questions; got ' + rows);
  }
  const supplementalQuestion = window.document.querySelector('[data-action="open-question"][data-qid="q17"]');
  assert(supplementalQuestion, 'Curriculum-tagged question q17 is missing from the question bank.');
  supplementalQuestion.click();
  assert(window.document.querySelector('.question-source-tag')?.textContent?.trim() === 'Curriculum',
    'Supplemental practice question should show the Curriculum source tag.');
  const activePassage = window.document.querySelector('.content .itemset-passage-block');
  const activeQuestionLayout = window.document.querySelector('.practice-layout');
  assert(activePassage && activeQuestionLayout &&
    (activePassage.compareDocumentPosition(activeQuestionLayout) & window.Node.DOCUMENT_POSITION_FOLLOWING),
    'Opening a question should show its shared passage in a separate container before the question workspace.');
  assert(window.document.querySelectorAll('.set-question-link').length >= 4, 'The opened question should expose navigation to related questions in its set.');
  const supplementalAnswer = window.document.querySelector('input[name="answer"][value="B"]');
  assert(supplementalAnswer, 'Supplemental FCFF question answer options did not render.');
  supplementalAnswer.click();
  click('[data-action="submit-answer"]');
  assert(window.document.querySelector('.feedback-card')?.textContent.includes('Correct'),
    'Supplemental practice question should provide worked feedback.');
  click('[data-action="next-question"]');

  nav('practice');
  assert(window.document.querySelectorAll('.practice-hub-card').length === 4,
    'Practice hub should consolidate question bank, active practice, item sets and timed mocks.');
  click('[data-action="open-question"][data-qid]');
  const answer = window.document.querySelector('input[name="answer"]');
  assert(answer, 'Opening a practice question did not render answer choices.');
  answer.click();
  click('[data-action="submit-answer"]');
  assert(window.document.querySelector('.feedback-card'), 'Practice submission did not show feedback.');

  nav('formulas');
  assert(window.document.querySelectorAll('.visual-map-card').length === 9, 'Formula & Visual Maps should contain nine expandable maps.');
  assert(window.document.querySelectorAll('.learning-chart-card').length === 2, 'Formula & Visual Maps should contain two illustrative graphs.');
  click('.visual-map-card > summary');
  assert(window.document.querySelector('.memory-map-diagram .memory-node'), 'Opening a memory map did not render its diagram nodes.');
  click('.formula-library-accordion > summary');
  click('[data-action="formula-to-note"]');
  const afterFormula = JSON.parse(window.localStorage.getItem('cfa-equity-academy:v1'));
  assert(afterFormula.profiles[afterFormula.activeProfile].notes.some(note => note.title === 'Gordon growth model'),
    'Add formula to personal notes action did not persist a note.');

  nav('practice');
  click('[data-action="nav"][data-page="itemset"]');
  const passages = window.document.querySelectorAll('.itemset-passage-block');
  const relatedQuestions = window.document.querySelectorAll('.itemset-questions-container');
  assert(passages.length >= 6, 'Case-based practice should show separate passage blocks for shared vignettes.');
  assert(passages.length === relatedQuestions.length,
    'Every case passage must have a separate related-questions block.');
  assert(visibleText().includes('PASSAGE / CASE FACTS') && visibleText().includes('Related questions'),
    'Item sets must visibly separate passages from linked questions.');
  click('[data-action="open-question"][data-qid]');
  assert(window.document.querySelector('.question-heading'), 'Opening an item-set question did not open the practice view.');
  assert(window.document.querySelector('.practice-layout'), 'Item-set question should open the answer workspace.');
  const importedDemo = [
    {id:'book-m1-q1',module:'m1',topic:'Perceived mispricing',type:'Source MCQ',difficulty:'Needs review',title:'LM 1 · Q1: perceived mispricing',stem:'Which gap is relevant to an active manager?',options:[{key:'A',text:'Price and estimate'},{key:'B',text:'True intrinsic value and price'},{key:'C',text:'Estimate and true value'}],correct:'B',sourceBookQuestion:true,bookImported:true,sourcePage:'41',sourceLabel:'Curriculum',verificationStatus:'Needs explanation review'},
    {id:'book-m1-q2',module:'m1',topic:'Measures of value',type:'Source MCQ',difficulty:'Needs review',title:'LM 1 · Q2: analyst might ignore?',stem:'With respect to Statements 3 and 4, which measure of value would the distressed securities fund’s analyst consider that a core equity fund analyst might ignore?',options:[{key:'A',text:'Fair value'},{key:'B',text:'Liquidation value'},{key:'C',text:'Fair market value'}],correct:'B',sourceBookQuestion:true,bookImported:true,sourcePage:'42',sourceLabel:'Curriculum',verificationStatus:'Needs explanation review'},
    {id:'book-m1-q3',module:'m1',topic:'Going concern value',type:'Source MCQ',difficulty:'Needs review',title:'LM 1 · Q3: going concern value',stem:'Which value premise best suits a core fund focused on future operating cash flow?',options:[{key:'A',text:'Liquidation value'},{key:'B',text:'Investment value'},{key:'C',text:'Going-concern value'}],correct:'C',sourceBookQuestion:true,bookImported:true,sourcePage:'42',sourceLabel:'Curriculum',verificationStatus:'Needs explanation review'},
    {id:'book-m1-q4',module:'m1',topic:'Market expectations',type:'Source MCQ',difficulty:'Needs review',title:'LM 1 · Q4: extract market expectations',stem:'What can an analyst infer by comparing a valuation model with market price?',options:[{key:'A',text:'Market-implied expectations'},{key:'B',text:'Book depreciation'},{key:'C',text:'Only liquidation proceeds'}],correct:'A',sourceBookQuestion:true,bookImported:true,sourcePage:'42',sourceLabel:'Curriculum',verificationStatus:'Needs explanation review'}
  ];
  window.eval('state.shared.customQuestions = '+JSON.stringify(importedDemo)+'; ui.sourcePages=[]; ui.sourceBlockIndex=null; ui.page="questions"; ui.practiceMode=false; saveState(); renderApp();');
  const sourceSet = [...window.document.querySelectorAll('.question-set-card')].find(card => card.textContent.includes('Source item set A'));
  assert(sourceSet, 'An imported LM1 source question without a stored set ID must be grouped into Source item set A.');
  assert(sourceSet.querySelectorAll('.itemset-questions-container .question-row').length === 4,
    'Imported LM1 Questions 1–4 should appear together in one set.');
  assert(sourceSet.querySelector('.itemset-passage-block')?.textContent.includes('Global-Guardian Capital'),
    'Imported LM1 Questions 1–4 should show the shared Global-Guardian passage fallback.');
  click('[data-action="open-question"][data-qid="book-m1-q2"]');
  assert(window.document.querySelector('.practice-layout .itemset-passage-block')?.textContent.includes('financially distressed'),
    'The reported LM1 Q2 failure must show its shared passage when opened directly.');
  assert(window.document.querySelectorAll('.set-question-link').length === 4,
    'The source Q2 view should allow navigation among its four linked questions.');


  nav('practice');
  click('[data-action="nav"][data-page="mock"]');
  const mockForm = window.document.getElementById('mockForm');
  assert(mockForm, 'Timed mock form did not render from the Practice hub.');
  mockForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert(window.document.getElementById('examClock'), 'Starting a mock did not open the timed exam or start its clock.');
  for (let i = 0; i < 9; i++) click('[data-action="exam-next"]');
  click('[data-action="exam-finish"]');
  assert(visibleText().includes('Question-by-question review'), 'Submitting the mock did not render question-by-question results.');
  click('[data-action="new-mock"]');
  assert(window.document.getElementById('mockForm'), 'Create another mock did not return to setup.');

  nav('revision');
  click('[data-action="nav"][data-page="flashcards"]');
  click('[data-action="flash-reveal"]');
  click('[data-action="flash-next"]');
  click('[data-action="theme"]');
  assert(window.document.body.classList.contains('light-mode'), 'Theme button did not switch to light mode.');
  click('[data-action="theme"]');
  assert(!window.document.body.classList.contains('light-mode'), 'Theme button did not switch back to dark mode.');

  nav('settings');
  const goal = window.document.getElementById('dailyGoal');
  assert(goal, 'Study goal field not rendered.');
  goal.value = '60';
  click('[data-action="save-settings"]');
  const stored = JSON.parse(window.localStorage.getItem('cfa-equity-academy:v1'));
  assert(stored.profiles[stored.activeProfile].dailyGoal === 60, 'Save preferences button did not persist the daily goal.');

  nav('learn');
  click('[data-action="nav"][data-page="notes"]');
  click('.personal-notes-details > summary');
  const titleField = window.document.getElementById('noteTitle');
  assert(titleField, 'Personal note form is missing from the detailed Notes page.');
  titleField.value = 'Smoke test note';
  window.document.getElementById('noteText').value = 'Saved by UI smoke test.';
  window.document.getElementById('noteForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert(visibleText().includes('Smoke test note'), 'Notes form did not save a personal note.');

  assert(runtimeErrors.length === 0, 'Runtime errors: ' + runtimeErrors.join(' | '));
  assert(consoleErrors.length === 0, 'DOM/browser errors: ' + consoleErrors.join(' | '));
  console.log('UI smoke test passed: compact navigation, 10-subject tracker, six Equity modules, 97 source notes, nine memory maps, two graphs, 60-question bank, passage-based sets, active practice, mock submission, notes filtering and theme/settings persistence.');
  dom.window.close();
})().catch(error => {
  console.error(error.stack || error);
  dom.window.close();
  process.exitCode = 1;
});
