# CFA Level II Equity Academy

A private-first learning and practice platform for Sampurn Anand and Aaryani Dogra, built around an uploaded CFA Level II Equity curriculum.

## Project goals

- Inventory the uploaded book's readings, learning objectives, examples, exhibits, and identifiable questions.
- Provide original, clear, source-grounded explanations for each verified question, including step-by-step calculations and analysis of distractors.
- Support learning, question-bank practice, item sets, mock tests, formulas, flashcards, revision, bookmarks, notes, and progress analytics.
- Keep learner progress independent for Sampurn Anand and Aaryani Dogra.
- Never fabricate answer keys, source references, question counts, or analytics.

## Content integrity

The uploaded book is a source for private learning. Do not commit the complete source book or publish bulk copyrighted content. Keep track of extraction and verification status, cite source locations when available, and flag ambiguous or unreadable material.

## Architecture notes

The likely architecture is a React + TypeScript frontend with a persistent authenticated backend (for example, Supabase) if cross-device progress synchronization is needed. GitHub Pages can host only a static frontend; it does not supply authentication or a private database. Choose the final stack after inspecting the book and deployment requirements.

Never put secrets, service-role keys, or privileged API keys in client-side code or committed files.

## Initial status

- Repository created and accessible.
- Default branch: `main`.
- Curriculum file: not yet uploaded.
- Application: not yet implemented.
- Deployment: not yet configured.

See `PROJECT_BRIEF.md` for the implementation scope and acceptance criteria.
