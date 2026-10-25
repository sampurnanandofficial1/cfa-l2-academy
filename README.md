# CFA Level II Study Hub

A CFA Level II 2026 study dashboard for all ten topic areas, with integrated source-labeled study notes and an expanded Equity practice bank.

## Current application

- All-in-one Detailed Notes library combining source-organized notes, expanded teaching guides, formula explanations with variable definitions and worked illustrations, mind maps, sensitivity graphs, example lessons, personal notes, bookmarks, and a browser-local full-curriculum page index. The source vault indexes the supplied PDF locally rather than bundling or publishing the copyrighted text.

- Responsive study dashboard with light/dark theme and coverage of all ten 2026 Level II topic areas.
- Per-learner subject status tracking for Not started, In progress, Needs revision, and Completed.
- Six learning modules, topic guides, and a searchable curriculum explorer.
- Original in-app multiple-choice practice with worked solutions and distractor explanations, organized as item sets with separate passage and linked-question containers.
- Passage-first item-set practice preserves the exact question ranges printed in the curriculum; search and status filters show the complete matching set. The Detailed Notes view inventories Example and Exhibit headings, source-defined EOC ranges and standalone questions from the browser-local PDF archive.
- Formula library, flashcards, revision queue, notes, bookmarks, mock exams, and performance analytics.
- Independent learner profiles stored in the current browser.
- Public, source-labeled notes and original questions; the visible navigation does not require uploading the source PDFs.
- Question Builder for reviewing source questions, answer keys, steps, distractor explanations, and source references.
- Integrated study notes derived from the supplied handwritten SSEI LM1 notes and the concepts represented in the supplemental Equity curriculum practice file, with inline `SSEI` or `Curriculum` labels.
- The question bank currently contains 60 original, fully explained questions. The notes catalogue combines the supplied SSEI notes, summaries of each section guide, deeper teaching notes, and example/exhibit synthesis. Visual maps, memory hooks and illustrative graphs support recall. These are transformed study aids, not one-for-one reproductions of every source example, exhibit or end-of-module question. They are not copied verbatim from the source PDF.

## Important scope and data limits

- The original PDFs are **not stored in this public repository** or bundled into the deployed site. The handwritten notes and practice-set themes have instead been interpreted into public, source-labeled study notes and original practice questions. The full question PDF is not republished verbatim.
- PDF text extraction is performed in the browser. It can miss questions or scramble tables and line order. Imported candidates remain unverified until the learner checks them against the original pages.
- This version does not automatically generate expert AI explanations from the whole book. It provides a source-grounded prompt builder and fields to add reviewed explanations.
- The all-ten-subject status tracker and learner progress are stored in browser storage, not a secured remote database. The left navigation is subject-agnostic and focuses on Overview, Learn, Practice, Formula & Visual Maps, Review, All Subjects and Settings. Current content is populated for Equity Valuation; the other nine topic areas remain in the subject tracker until their source material is provided.
- Profiles and progress are stored in browser storage, not a secured remote database. The name selector is not authentication, progress does not sync across devices, and people sharing the same browser can switch profiles. Do not use it as a security boundary.
- Do not commit the source book, bulk copyrighted question text, credentials, service-role keys, or privileged API keys.
- For secure, separate accounts and cross-device synchronization, a supported backend (for example, Supabase) still needs to be configured with proper authentication and row-level security.

## Deploy with GitHub Pages

A deployment workflow lives at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). It checks JavaScript syntax, lints for undefined browser identifiers, runs UI interaction regression tests for notes, practice and case passages, prepares a static artifact, and deploys to GitHub Pages.

One-time repository setup is required before the first successful deployment:

1. Open [Settings → Pages](https://github.com/sampurnanandofficial1/cfa-l2-academy/settings/pages).
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Return to the [Actions workflow](https://github.com/sampurnanandofficial1/cfa-l2-academy/actions). Pushes to `main` deploy automatically; you can also run the workflow manually.

The connected GitHub tool can update repository files but cannot change the repository’s Pages setting directly. The Pages workflow will fail at “Configure Pages” until the one-time setting above is enabled. Private-repository Pages availability also depends on the GitHub plan.

## Subject map and source labels

The subject map follows the 2026 CFA Institute Level II topic outline: Quantitative Methods, Economics, Financial Statement Analysis, Corporate Issuers, Equity Valuation, Fixed Income, Derivatives, Alternative Investments, Portfolio Management, and Ethical and Professional Standards. See the [official 2026 Level II topic outlines](https://www.cfainstitute.org/sites/default/files/docs/programs/cfa-program/2026-l2-topics-combined.pdf).

The handwritten LM1 concepts are labeled **SSEI** in the integrated Notes page. The supplemental practice-set themes are labeled **Curriculum** in notes and the Practice bank. The original CFA Institute curriculum, exhibits and end-of-module questions are not reproduced verbatim in the public site. Instead, the notes summarize every topic guide, examples/exhibits are interpreted as study takeaways, and the practice bank provides original, fully explained questions.

## Local study data

The app stores learner attempts and notes in this browser's localStorage, and extracted source pages in IndexedDB. Use **Profile & Settings → Export active learner JSON** to back up progress before clearing browser data or changing devices. 

## Curriculum source

The curriculum outline and printed-page mappings are based on the CFA Program Curriculum 2026 Level II Equity Valuation volume supplied for this study project. Extraction counts are displayed as candidates, not as verified question totals.


### Source mapping integrity

- Curriculum item sets are grouped only when the current source archive contains an explicit question-range heading and a non-empty shared passage. Stale inferred mappings are not trusted.
- Item-set cards display full question stems and answer choices inline. If a source passage cannot be verified, the question is marked as unverified instead of attaching a guessed passage.
- Complete inventory coverage of curriculum examples, exhibits, practice questions and solutions depends on indexing the original PDF in Source Vault. The PDF is not bundled in the public static deployment.
