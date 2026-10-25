# CFA Level II Study Hub

A local-first CFA Level II 2026 study dashboard for all ten topic areas, with a detailed Equity Valuation workspace for Sampurn Anand and Aaryani Dogra.

## Current application

- Responsive study dashboard with light/dark theme and coverage of all ten 2026 Level II topic areas.\n- Per-learner subject status tracking for Not started, In progress, Needs revision, and Completed.
- Six learning modules, topic guides, and a searchable curriculum explorer.
- Original in-app multiple-choice practice with worked solutions and distractor explanations.
- Formula library, flashcards, revision queue, notes, bookmarks, mock exams, and performance analytics.
- Independent learner profiles stored in the current browser.
- Local PDF import: extracts source practice/solution page ranges into a browser-local page vault and creates question candidates where parsing is successful.
- Question Builder for reviewing source questions, answer keys, steps, distractor explanations, and source references.\n- SSEI-labeled resource cards for Equity LM1 handwritten notes (23 PDF pages) and the additional practice-question PDF covering printed pages 265–438.\n- Browser-local PDF vault for the supplied SSEI files and additional subject materials.

## Important scope and data limits

- The source book and the two supplied SSEI PDFs are **not stored in this public repository** or bundled into the deployed site. Add the PDFs through **SSEI & Study Resources**; they stay in the browser’s IndexedDB and are not sent to a server.
- PDF text extraction is performed in the browser. It can miss questions or scramble tables and line order. Imported candidates remain unverified until the learner checks them against the original pages.
- This version does not automatically generate expert AI explanations from the whole book. It provides a source-grounded prompt builder and fields to add reviewed explanations.
- The all-ten-subject status tracker and learner progress are stored in browser storage, not a secured remote database. The interactive built-in question bank and detailed chapter guides are currently Equity-focused; the other nine topic areas are included in the subject map/status tracker and can accept local materials. This does not claim that a complete practice bank exists for every subject.\n- SSEI resource cards show the source label requested for the uploaded materials. PDFs must be selected from the user’s device in each browser where they are needed; they are not public downloads and do not sync across devices.\n- Profiles and progress are stored in browser storage, not a secured remote database. The name selector is not authentication, progress does not sync across devices, and people sharing the same browser can switch profiles. Do not use it as a security boundary.
- Do not commit the source book, bulk copyrighted question text, credentials, service-role keys, or privileged API keys.
- For secure, separate accounts and cross-device synchronization, a supported backend (for example, Supabase) still needs to be configured with proper authentication and row-level security.

## Deploy with GitHub Pages

A deployment workflow lives at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). It checks JavaScript syntax, prepares a static artifact, and deploys to GitHub Pages.

One-time repository setup is required before the first successful deployment:

1. Open [Settings → Pages](https://github.com/sampurnanandofficial1/cfa-l2-academy/settings/pages).
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Return to the [Actions workflow](https://github.com/sampurnanandofficial1/cfa-l2-academy/actions). Pushes to `main` deploy automatically; you can also run the workflow manually.

The connected GitHub tool can update repository files but cannot change the repository’s Pages setting directly. The Pages workflow will fail at “Configure Pages” until the one-time setting above is enabled. Private-repository Pages availability also depends on the GitHub plan.

## Subject map and source labels\n\nThe subject map follows the 2026 CFA Institute Level II topic outline: Quantitative Methods, Economics, Financial Statement Analysis, Corporate Issuers, Equity Valuation, Fixed Income, Derivatives, Alternative Investments, Portfolio Management, and Ethical and Professional Standards. See the [official 2026 Level II topic outlines](https://www.cfainstitute.org/sites/default/files/docs/programs/cfa-program/2026-l2-topics-combined.pdf).\n\nThe two user-supplied Equity resources are labeled **SSEI** in the UI. They are not embedded in the public site; upload each PDF from the Study Resources page in the browser where you need it.\n\n## Local study data

The app stores learner attempts and notes in this browser's localStorage, and extracted source pages in IndexedDB. Use **Profile & Settings → Export active learner JSON** to back up progress before clearing browser data or changing devices. The source page vault has a separate export.

## Curriculum source

The curriculum outline and printed-page mappings are based on the CFA Program Curriculum 2026 Level II Equity Valuation volume supplied for this study project. Extraction counts are displayed as candidates, not as verified question totals.
