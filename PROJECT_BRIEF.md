# Project Brief — CFA Level II Equity Academy

## Purpose

Build a high-quality, source-grounded CFA Level II Equity study platform for two learners:
- Sampurn Anand
- Aaryani Dogra

The uploaded CFA Level II Equity curriculum will be the primary source for curriculum structure and source questions. The application must teach the reasoning behind questions, not merely repeat answer-key explanations.

## Product principles

1. **Source-grounded:** Every imported question should retain provenance such as reading, section, learning objective, page, and exhibit when available.
2. **Honest coverage:** Maintain an auditable inventory and clearly label extracted, verified, explained, and pending questions. Never imply completeness without evidence.
3. **Better teaching:** Explain first principles, step-by-step reasoning, each answer choice, formula selection, financial interpretation, common traps, and a related original practice problem where useful.
4. **Separate learners:** Keep attempts, notes, bookmarks, flashcards, revision records, study time, goals, and analytics separate for each learner.
5. **Persistent progress:** Progress should survive reloads and deployments; use a secure backend for cross-device sync.
6. **No secrets in frontend:** Never commit privileged keys, service-role credentials, passwords, or the source book.
7. **No fabricated analytics:** The dashboard must derive from actual learner activity, not demo numbers.
8. **Accessible, responsive UI:** Support keyboard navigation, readable math and tables, desktop and mobile layouts, light/dark themes, and clear loading/error/empty states.

## Planned navigation

- Home Dashboard
- Learn
- Curriculum Explorer
- Question Bank
- Practice Sessions
- Item-Set Practice
- Mock Exams
- Formula Library
- Flashcards
- Revision Centre
- Performance Analytics
- Bookmarks and Notes
- Profile and Settings

All visible controls must work; avoid placeholders and fake charts.

## Question explanation specification

For every verified question, provide as applicable:
- Faithful question stem, answer choices, vignette, exhibits, and source metadata.
- Answer-selection interaction and learning/exam modes.
- Correct answer and short verdict.
- Plain-language explanation from first principles.
- Ordered solution and intermediate calculations for numerical questions.
- Explanation of every distractor and likely misconception.
- Formula definitions, assumptions, calculator guidance where useful, and financial interpretation.
- Relevant exam traps and a memory aid.
- An additional original practice variant with its own explained answer.
- Source references and a flag for ambiguity or answer-key disagreement.

Maintain a distinction between source-provided answers, independent verification, and AI-generated teaching explanations. Never invent official answers or citations.

## Learner data model (initial proposal)

Use stable IDs and a versioned schema for:
- users / learner profiles
- curriculum readings, sections, learning objectives
- questions, answer choices, vignettes, exhibits, source references
- explanations and verification status
- question attempts and practice sessions
- mock exams and exam attempts
- bookmarks, notes, flashcards
- formula records
- topic mastery and revision schedules
- study goals and activity events

Question attempts should record learner ID, question ID, selected answer, correctness, attempt number, timestamp, elapsed time, confidence when supplied, and session metadata. Import updates must not reset learner histories.

## Suggested implementation approach

Choose the final stack after inspecting the uploaded file and confirming hosting requirements. A reasonable default:
- React + TypeScript + Vite
- reusable accessible UI components and responsive styling
- a chart library and KaTeX/MathJax for formula rendering
- Supabase or Firebase for authentication and synchronized progress, if supported and authorized
- GitHub Actions for build/test automation
- a suitable static frontend host plus a secure external backend

GitHub Pages serves static assets and is not itself an authenticated database. If GitHub Pages is selected, keep authentication and learner records in a secure backend. Apply row-level access control or equivalent so each learner can access only their own private records.

## Curriculum ingestion workflow

1. Inspect PDF/page count, outline, text extraction quality, formulas, tables, exhibits, and scanned pages.
2. Extract a curriculum map and question inventory with stable IDs.
3. Store source location and confidence for each item.
4. Validate text, answer choices, answer keys, and math; flag OCR uncertainty.
5. Track status such as identified, extracted, reviewed, answer verified, explanation complete, and imported.
6. Make processing resumable and idempotent to avoid duplicate records.
7. Keep a content-quality view with inventory totals and outstanding work.

Do not publish the complete copyrighted book or large verbatim excerpts. Keep source files and restricted source material out of the public deployment bundle and repository.

## Acceptance criteria

- Deployed app has a verified URL and a clean production build.
- Core routes, navigation, search, filters, answer submission, scoring, timing, flagging, and revision functions work.
- Every question's import and verification status can be audited.
- Numerical answers and calculation steps are validated.
- Item-set navigation preserves shared vignettes where applicable.
- Both learners have isolated progress and private notes.
- Progress persists across refreshes and, when configured, synchronizes across devices.
- Charts reflect real stored data only.
- Authentication and access controls are tested.
- No privileged secrets appear in repository files or browser bundles.
- Mobile layout and accessibility are checked.
- Known limitations and unconfigured integrations are explicitly documented.

## Current setup status

- GitHub repository: `sampurnanandofficial1/cfa-l2-academy`
- Default branch: `main`
- Curriculum uploaded: No
- Application scaffold: Not created
- Backend/authentication: Not configured
- Deployment: Not configured

Next step: attach the CFA Level II Equity book and provide the build instructions. Inspect the repository and uploaded file before choosing final architecture or importing content.
