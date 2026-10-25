const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync('index.html', 'utf8');
const appSource = fs.readFileSync('app.js', 'utf8');
const earlyAssert = (condition, message) => { if (!condition) throw new Error(message); };

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
earlyAssert(appSource.includes("function sourcePlan(pdfPages)"), 'The source vault must plan the complete curriculum page range.');
earlyAssert(appSource.includes("type='Curriculum text'"), 'The source vault must index learning text and example/exhibit pages.');
earlyAssert(appSource.includes("function reconcileImportedBookQuestions()"), 'Saved question mappings must be repaired from local source pages at startup.');
earlyAssert(!appSource.includes("'lm1-valuation-foundations'"), 'A hand-written passage must never be used as a fallback for a source-book question.');
earlyAssert(!appSource.includes('const QUESTION_SET_DEFINITIONS = ['), 'The old arbitrary q-number-to-passage mapping must be removed.');

// Exercise the real parser with a multiline source heading and a standalone question.
const parserStart = appSource.indexOf('function cleanSourceLine(line) {');
const parserEnd = appSource.indexOf('\nfunction parseSourceOptions(stem)', parserStart);
const helperStart = appSource.indexOf('function sourceQuestionNumber(q) {');
const helperEnd = appSource.indexOf('\nconst FORMULAS = [', helperStart);
earlyAssert(parserStart >= 0 && parserEnd > parserStart && helperStart >= 0 && helperEnd > helperStart,
  'Source parser functions could not be isolated for regression testing.');
const parserContext = {
  MODULES:[{id:'m1',no:1,questionCount:5,title:'Test Learning Module'}],
  ui:{sourcePages:[],sourceBlockIndex:null},
  VIGNETTES:{},
  getModule:id=>({no:Number(String(id).replace(/\D/g,''))||1,title:'Test Learning Module'}),
  esc:value=>String(value)
};
vm.createContext(parserContext);
vm.runInContext(appSource.slice(parserStart,parserEnd)+'\n'+appSource.slice(helperStart,helperEnd),parserContext);
const fixturePages=[{id:'m1-practice-41',module:'m1',printedPage:41,type:'Practice problems',text:[
  'PRACTICE PROBLEMS 41',
  'The following information relates to questions',
  '1-4',
  'Aster Capital is evaluating the shares of a listed company.',
  'The passage contains the full operating context and its key assumptions.',
  'EXHIBIT 1: Forecast information',
  '1. Which conclusion follows from the case?',
  'A. First choice',
  'B. Second choice',
  'C. Third choice',
  '2. Which additional interpretation is justified?',
  'A. First choice',
  'B. Second choice',
  'C. Third choice',
  '3. Which assumption is most relevant?',
  'A. First choice',
  'B. Second choice',
  'C. Third choice',
  '4. Which result is best supported?',
  'A. First choice',
  'B. Second choice',
  'C. Third choice',
  '5. A separate standalone question with its own facts.',
  'A. First choice',
  'B. Second choice',
  'C. Third choice'
].join('\n')}];
const parsedFixture=parserContext.splitNumberedSourceBlocks(fixturePages,'m1','Practice problems',5);
earlyAssert(parsedFixture.blocks.length===5,'Parser fixture should retain all five question stems.');
const fixture1=parsedFixture.blocks.find(block=>block.num===1),fixture2=parsedFixture.blocks.find(block=>block.num===2),fixture4=parsedFixture.blocks.find(block=>block.num===4),fixture5=parsedFixture.blocks.find(block=>block.num===5);
earlyAssert(fixture1.sourceSetId==='source-m1-q1-4'&&fixture4.sourceSetId==='source-m1-q1-4',
  'Questions 1–4 must be linked by the explicit source range, not an inferred topic mapping.');
earlyAssert(fixture1.passageText.includes('Aster Capital')&&fixture1.passageText.includes('EXHIBIT 1')&&fixture1.passageText.includes('key assumptions'),
  'The parser must preserve the full context and exhibit text preceding the linked questions.');
earlyAssert(fixture1.passageText===fixture2.passageText&&fixture2.passageText===fixture4.passageText,
  'All questions in the same source range must share exactly the same passage.');
earlyAssert(fixture1.questionText.startsWith('Which conclusion follows')&&!fixture1.questionText.includes('Aster Capital'),
  'Shared passage must not be prepended to the individual question stem.');

earlyAssert(!fixture5.sourceSetId&&!fixture5.passageText,
  'A standalone question outside an explicit shared range must not receive an invented passage.');

// Long curriculum sets must retain the full range stated by the source, not be split into synthetic subgroups.
const longRangeLines=[
  'PRACTICE PROBLEMS 41','The following information relates to questions','1-8',
  'Global-Guardian Capital is a rapidly growing international investment firm.',
  'The shared passage contains the full operating context and its key assumptions.',
  'Statement 3: A distressed securities fund considers the liquidation premise.',
  'EXHIBIT 1: Forecast and valuation inputs','Revenue and free-cash-flow assumptions for the shared case.',
  '1. What conclusion follows from the shared case?','A. First choice','B. Second choice','C. Third choice',
  '2. Which value premise may matter to the distressed fund?','A. Fair value','B. Liquidation value','C. Fair market value',
  '3. Which further statement is supported?','A. First','B. Second','C. Third',
  '4. Which assumption is relevant?','A. First','B. Second','C. Third',
  '5. Which valuation choice is defensible?','A. First','B. Second','C. Third',
  '6. Which input should be reviewed?','A. First','B. Second','C. Third',
  '7. Which interpretation follows?','A. First','B. Second','C. Third',
  '8. Which conclusion best fits the case?','A. First','B. Second','C. Third',
  '9. This question starts a separate item with no shared-passage heading.','A. First','B. Second','C. Third'
].join('\n');
const longRangePages=[{id:'m1-practice-41',module:'m1',printedPage:41,pdfPage:51,type:'Practice problems',text:longRangeLines}];
const longRangeParsed=parserContext.splitNumberedSourceBlocks(longRangePages,'m1','Practice problems',9);
const lr1=longRangeParsed.blocks.find(block=>block.num===1),lr8=longRangeParsed.blocks.find(block=>block.num===8),lr9=longRangeParsed.blocks.find(block=>block.num===9);
earlyAssert(longRangeParsed.blocks.length===9,'Long-range fixture must retain all nine numbered questions.');
earlyAssert(lr1.sourceSetId==='source-m1-q1-8'&&lr8.sourceSetId==='source-m1-q1-8'&&lr1.sourceGroupTo===8,
  'An explicit Questions 1–8 heading must not be split into invented smaller sets.');
earlyAssert(lr1.passageText===lr8.passageText&&lr1.passageText.includes('Global-Guardian')&&lr1.passageText.includes('EXHIBIT 1')&&lr1.passageText.includes('key assumptions'),
  'All linked questions must share the exact same full passage and exhibit text.');
earlyAssert(lr1.questionText.startsWith('What conclusion')&&!lr1.questionText.includes('Global-Guardian'),
  'The passage must stay separate from the individual question stem.');
earlyAssert(!lr9.sourceSetId&&!lr9.passageText,'A question outside the declared 1–8 range must not inherit the passage.');

// Verify the live curriculum inventory using local fixture pages, without bundling source text in the public app.
parserContext.MODULES[0].questionCount=9;
parserContext.ui.sourcePages=[
  {id:'m1-curriculum-10',module:'m1',printedPage:10,pdfPage:20,type:'Curriculum text',text:'EXAMPLE 1\nA fully indexed teaching example\nEXHIBIT 1: Illustration of assumptions'},
  longRangePages[0]
];
parserContext.ui.sourceBlockIndex=null;parserContext.ui.curriculumInventoryCache=null;
parserContext.state={shared:{sourceMeta:{fileName:'source-fixture.pdf',importedAt:'test-fixture'}}};
const inventoryStart=appSource.indexOf('function buildCurriculumInventory()');
const inventoryEnd=appSource.indexOf('\nfunction renderNotes()',inventoryStart);
earlyAssert(inventoryStart>=0&&inventoryEnd>inventoryStart,'Curriculum inventory helper could not be isolated.');
vm.runInContext(appSource.slice(inventoryStart,inventoryEnd),parserContext);
const inventoryFixture=parserContext.buildCurriculumInventory();
earlyAssert(inventoryFixture.examples.length===1&&inventoryFixture.exhibits.length===1,
  'The inventory must enumerate Example and Exhibit headings in source text.');
earlyAssert(inventoryFixture.questionCount===9&&inventoryFixture.sets.length===1&&inventoryFixture.sets[0].title.includes('1–8')&&inventoryFixture.standalone.length===1,
  'The inventory must preserve the exact 1–8 source set and list question 9 separately.');


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
  assert(window.document.getElementById('notes-source-inventory'),
    'Detailed Notes must include a source inventory section for examples, exhibits and EOC question ranges.');
  assert(window.document.getElementById('notes-source-pages'),
    'Detailed Notes must retain the local full curriculum source pages view.');
  assert(window.document.querySelector('#notes-source-inventory')?.textContent.includes('Source not indexed'),
    'When source text is not local, the inventory must report missing indexing instead of inventing source contents.');
  assert(window.document.querySelectorAll('.integrated-guide-card').length === 12,
    'Detailed Notes should include twelve expanded teaching guides.');
  assert(window.document.querySelectorAll('.unified-formula-card').length === 13,
    'Detailed Notes should include the formula reference with variable definitions and worked illustrations.');
  assert(window.document.querySelectorAll('.unified-visual-map').length === 9,
    'Detailed Notes should include all nine mind maps in the same view.');
  assert(window.document.querySelectorAll('.learning-chart-card').length === 2,
    'Detailed Notes should include both illustrative sensitivity graphs.');
  for (const id of ['notes-topic-library','notes-teaching-guides','notes-formulas','notes-mind-maps','notes-examples','notes-personal','notes-source-pages']) {
    assert(window.document.getElementById(id), 'Unified notes section is missing: ' + id);
  }
  assert(window.document.querySelector('#studyNoteSearch')?.placeholder.includes('all notes, formulas, variables, maps'),
    'Detailed Notes should use one search box across all study content.');
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
  assert(builtInSets.length > 11, 'The bank should group genuine shared-vignette questions and keep independent questions standalone.');
  let displayedQids = [];
  for (const set of builtInSets) {
    assert(set.querySelectorAll('.itemset-passage-block').length === 1,
      'Each displayed group must have a separate context container: ' + set.querySelector('.card-title')?.textContent);
    assert(set.querySelectorAll('.itemset-questions-container').length === 1,
      'Each displayed group must have a separate question container.');
    displayedQids.push(...[...set.querySelectorAll('.itemset-questions-container .question-row')].map(row=>row.dataset.qid));
  }
  assert(displayedQids.length === 60 && new Set(displayedQids).size === 60,
    'All 60 built-in questions must appear exactly once across the item-set bank.');
  assert(builtInSets.some(set=>set.textContent.includes('STANDALONE QUESTION CONTEXT')),
    'Questions without a shared passage should be visibly marked as standalone.');
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
  // Reopen a separate browser session with existing imported-question data, as a returning learner would.
  const importedDemo = [
    {id:'book-m1-q1',module:'m1',topic:'Perceived mispricing',type:'Source MCQ',difficulty:'Needs review',title:'LM 1 · Q1: perceived mispricing',stem:'Which gap is relevant to an active manager?',options:[{key:'A',text:'Price and estimate'},{key:'B',text:'True intrinsic value and price'},{key:'C',text:'Estimate and true value'}],correct:'B',sourceBookQuestion:true,bookImported:true,sourcePage:'41',sourceLabel:'Curriculum',verificationStatus:'Needs explanation review'},
    {id:'book-m1-q2',module:'m1',topic:'Measures of value',type:'Source MCQ',difficulty:'Needs review',title:'LM 1 · Q2: analyst might ignore?',stem:'With respect to Statements 3 and 4, which measure of value would the distressed securities fund’s analyst consider that a core equity fund analyst might ignore?',options:[{key:'A',text:'Fair value'},{key:'B',text:'Liquidation value'},{key:'C',text:'Fair market value'}],correct:'B',sourceBookQuestion:true,bookImported:true,sourcePage:'42',sourceLabel:'Curriculum',verificationStatus:'Needs explanation review'},
    {id:'book-m1-q3',module:'m1',topic:'Going concern value',type:'Source MCQ',difficulty:'Needs review',title:'LM 1 · Q3: going concern value',stem:'Which value premise best suits a core fund focused on future operating cash flow?',options:[{key:'A',text:'Liquidation value'},{key:'B',text:'Investment value'},{key:'C',text:'Going-concern value'}],correct:'C',sourceBookQuestion:true,bookImported:true,sourcePage:'42',sourceLabel:'Curriculum',verificationStatus:'Needs explanation review'},
    {id:'book-m1-q4',module:'m1',topic:'Market expectations',type:'Source MCQ',difficulty:'Needs review',title:'LM 1 · Q4: extract market expectations',stem:'What can an analyst infer by comparing a valuation model with market price?',options:[{key:'A',text:'Market-implied expectations'},{key:'B',text:'Book depreciation'},{key:'C',text:'Only liquidation proceeds'}],correct:'A',sourceBookQuestion:true,bookImported:true,sourcePage:'42',sourceLabel:'Curriculum',verificationStatus:'Needs explanation review'}
  ];
  const emptyProfile = name => ({name,dailyGoal:45,attempts:[],bookmarks:[],notes:[],flashcardScores:{},studyLog:[],confidence:{},topicStatus:{},lastVisit:null});
  const seededState = {version:'1.0.0',activeProfile:'Sampurn Anand',theme:'dark',profiles:{'Sampurn Anand':emptyProfile('Sampurn Anand'),'Aaryani Dogra':emptyProfile('Aaryani Dogra')},shared:{customQuestions:importedDemo,sourceMeta:null}};
  const sourceDom = new JSDOM(html,{url:'https://academy.example.test/cfa-l2-academy/source-import-check',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
  sourceDom.window.scrollTo=()=>{};
  sourceDom.window.confirm=()=>true;
  sourceDom.window.localStorage.setItem('cfa-equity-academy:v1',JSON.stringify(seededState));
  const sourceErrors=[];
  sourceDom.window.addEventListener('error',event=>sourceErrors.push(String(event.message||event.error)));
  sourceDom.window.eval(appSource);
  await wait(80);
  const sourceNav=page=>{const node=sourceDom.window.document.querySelector('.sidebar .nav-item[data-page="'+page+'"]');assert(node,'Source-session navigation missing: '+page);node.click();};
  sourceNav('practice');
  sourceDom.window.document.querySelector('[data-action="nav"][data-page="questions"]').click();
  const sourceQ1Card=[...sourceDom.window.document.querySelectorAll('.question-set-card')].find(card=>card.textContent.includes('Q1: perceived mispricing'));
  assert(sourceQ1Card,'An imported LM1 source question should remain visible if source pages are not yet cached.');
  assert(sourceQ1Card.querySelectorAll('.itemset-questions-container .question-row').length===1,
    'An imported question without a verified source group must remain standalone.');
  assert(sourceQ1Card.querySelector('.itemset-passage-block')?.textContent.includes('STANDALONE QUESTION CONTEXT'),
    'Missing shared passage must be clearly identified rather than guessed.');
  assert(!sourceQ1Card.querySelector('.itemset-passage-block')?.textContent.includes('Global-Guardian'),
    'A passage must not be inferred from the question number or topic.');
  const sourceQ2Card=[...sourceDom.window.document.querySelectorAll('.question-set-card')].find(card=>card.textContent.includes('Q2: analyst might ignore'));
  assert(sourceQ2Card,'Imported LM1 Q2 must not disappear from the question bank.');
  sourceQ2Card.querySelector('[data-action="open-question"][data-qid="book-m1-q2"]').click();
  const sourcePassage=sourceDom.window.document.querySelector('.content .itemset-passage-block');
  const sourceLayout=sourceDom.window.document.querySelector('.practice-layout');
  assert(sourcePassage?.textContent.includes('STANDALONE QUESTION CONTEXT'),'Q2 without source-page cache must not receive a substitute passage.');
  assert(!sourcePassage?.textContent.includes('Global-Guardian'),'Q2 must never be mapped to the unrelated Q1–8 passage without source extraction.');
  assert(sourceLayout&&(sourcePassage.compareDocumentPosition(sourceLayout)&sourceDom.window.Node.DOCUMENT_POSITION_FOLLOWING),'The context container must appear separately before the question workspace.');
  assert(sourceDom.window.document.querySelectorAll('.set-question-link').length===1,'Unmapped standalone Q2 must not claim unrelated sibling questions.');
  assert(sourceDom.window.document.querySelector('.question-stem')?.textContent.includes('Statements 3 and 4'),'The imported question stem must remain separately visible.');
  assert(sourceErrors.length===0,'Source-session runtime errors: '+sourceErrors.join(' | '));
  sourceDom.window.close();

  const mappedQuestions=Array.from({length:8},(_,i)=>({
    id:'verified-map-q'+(i+1),module:'m1',topic:'Source range regression',type:'Source MCQ',difficulty:'Needs review',
    title:'LM 1 · Q'+(i+1)+': mapped case question',stem:'Unique stem token '+(i+1),
    options:[{key:'A',text:'Choice A'},{key:'B',text:'Choice B'},{key:'C',text:'Choice C'}],correct:'A',
    sourceBookQuestion:true,bookImported:true,sourceMappingVersion:2,sourceSetId:'source-m1-q1-8',
    sourceSetTitle:'LM 1 · Source item set (Questions 1–8)',sourceGroupFrom:1,sourceGroupTo:8,
    sourcePage:'41–43',sourcePdfPage:51,sourceLabel:'Curriculum',verificationStatus:'Needs explanation review'
  }));
  const rangeState={version:'1.0.0',activeProfile:'Sampurn Anand',theme:'dark',
    profiles:{'Sampurn Anand':emptyProfile('Sampurn Anand'),'Aaryani Dogra':emptyProfile('Aaryani Dogra')},
    shared:{customQuestions:mappedQuestions,sourceMeta:{expectedQuestionCount:222}}};
  const rangeDom=new JSDOM(html,{url:'https://academy.example.test/cfa-l2-academy/source-range-check',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
  rangeDom.window.scrollTo=()=>{};
  rangeDom.window.confirm=()=>true;
  rangeDom.window.localStorage.setItem('cfa-equity-academy:v1',JSON.stringify(rangeState));
  const rangeErrors=[];
  rangeDom.window.addEventListener('error',event=>rangeErrors.push(String(event.message||event.error)));
  rangeDom.window.eval(appSource);
  await wait(80);
  rangeDom.window.document.querySelector('.sidebar .nav-item[data-page="practice"]').click();
  rangeDom.window.document.querySelector('[data-action="nav"][data-page="questions"]').click();
  const rangeCard=[...rangeDom.window.document.querySelectorAll('.question-set-card')].find(card=>card.textContent.includes('Source item set (Questions 1–8)'));
  assert(rangeCard,'Corrected source metadata must render the original Questions 1–8 item set.');
  assert(rangeCard.querySelectorAll('.itemset-questions-container .question-row').length===8,
    'All eight questions named by the source range must appear together.');
  assert(rangeCard.querySelector('.itemset-passage-block')?.textContent.includes('SHARED PASSAGE UNAVAILABLE'),
    'Without local source pages, the app must report missing passage text rather than guess.');
  assert(!rangeCard.querySelector('.itemset-passage-block')?.textContent.includes('Global-Guardian'),
    'An unavailable passage must never be replaced with an unrelated or generic case.');
  const questionSearch=rangeDom.window.document.getElementById('questionSearch');
  questionSearch.value='Unique stem token 4';
  questionSearch.dispatchEvent(new rangeDom.window.Event('input',{bubbles:true}));
  const filteredRangeCard=[...rangeDom.window.document.querySelectorAll('.question-set-card')].find(card=>card.textContent.includes('Source item set (Questions 1–8)'));
  assert(filteredRangeCard&&filteredRangeCard.querySelectorAll('.itemset-questions-container .question-row').length===8,
    'Filtering a single question must keep all eight questions in the matching item set.');
  assert(rangeDom.window.document.querySelector('.question-bank-summary')?.textContent.includes('1 questions match filters'),
    'The bank must distinguish one filter match from the eight sibling questions displayed.');
  filteredRangeCard.querySelector('[data-action="open-question"][data-qid="verified-map-q4"]').click();
  assert(rangeDom.window.document.querySelectorAll('.set-question-link').length===8,
    'Question navigation must follow the full eight-question source range.');
  assert(rangeErrors.length===0,'Source-range UI errors: '+rangeErrors.join(' | '));
  rangeDom.window.close();

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
  console.log('UI smoke test passed: exact source-range parsing, no synthetic passage mapping, all 60 built-in questions, unified Detailed Notes plus local source-page index, full-source vault, practice navigation, mock submission and theme/settings persistence.');
  dom.window.close();
})().catch(error => {
  console.error(error.stack || error);
  dom.window.close();
  process.exitCode = 1;
});
