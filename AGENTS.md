# Agent Instructions

This project should be implemented with modern, non-deprecated, maintainable approaches.

## Engineering preferences

- Prefer current stable framework patterns over older/deprecated APIs.
- Avoid workaround-style code when a clean framework-native solution exists.
- Favor SOLID principles where they help keep the code simple and readable.
- Keep responsibilities separated:
  - Angular components should handle presentation and UI state.
  - Angular services should handle API communication.
  - Backend services should isolate file/database logic.
  - Express routes should stay thin and readable.
- Use meaningful variable names.
- Avoid unnecessary abstractions and over-engineering.
- Keep code simple, clean, and easy to change.

## Angular preferences

- Prefer modern Angular reactive state patterns.
- Prefer signals for local component UI state.
- Prefer Observable streams with `async` pipe for async data when appropriate.
- Do not use `ChangeDetectorRef.detectChanges()` for normal HTTP or click-handler updates.
- Do not use `setTimeout()` or `NgZone.run()` to force UI updates unless integrating a third-party callback that truly runs outside Angular.
- Do not mutate arrays in place with `push`, `splice`, or index assignment for UI state.
- Replace arrays immutably, for example:

```ts
this.questions = this.questions.filter((question) => question.id !== deletedQuestion.id);
```

or use reactive stream refresh patterns.

## Backend preferences

- Use modern TypeScript.
- Avoid deprecated TypeScript compiler settings.
- Keep backend source files inside `backend/`.
- Keep frontend source files inside `frontend/`.
- Keep prompt files inside `prompts/`.
- Do not add runtime OpenAI or ChatGPT integration unless explicitly requested.
- Do not require secrets or API keys unless explicitly requested.

## Verification

Before considering work complete:

- Run relevant builds/tests.
- Verify the app behavior manually when possible.
- Check browser console for Angular/runtime errors when changing frontend behavior.
- Keep the implementation aligned with the folder separation described in `README.md`.
