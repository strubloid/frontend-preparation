# Question Trainer

Question Trainer is a simple full-stack local study app. It lets you create study questions, open them, reveal answers, mark answers right or wrong, edit questions, delete questions, and create local generation requests for Codex/ChatGPT-assisted question generation.

The app does not call ChatGPT or OpenAI at runtime. A ChatGPT subscription is not a runtime API and cannot be used directly by the local app. The generation workflow intentionally saves a local request file that you can process manually with Codex/ChatGPT while developing.

## Folder structure

```txt
question-trainer/
├── frontend/
├── backend/
├── prompts/
└── README.md
```

All frontend work lives inside `frontend/`.
All backend work lives inside `backend/`.
Prompt files used by Codex/ChatGPT live inside `prompts/`.
The project root is only for organizing these folders and this README.

## Tech stack

- Frontend: Angular, TypeScript, SCSS
- Backend: Node.js, Express, TypeScript
- Database: local JSON files
- Authentication: none
- Cloud services: none
- OpenAI API key: not required

## Install and run the backend

```bash
cd backend
npm install
npm run dev
```

The backend runs at:

```txt
http://localhost:3000
```

Useful endpoint:

```txt
GET http://localhost:3000/api/health
```

## Install and run the frontend

Open another terminal:

```bash
cd frontend
npm install
npm start
```

Angular prints the local URL, usually:

```txt
http://localhost:4200
```

## Local JSON database

The backend stores data in local JSON files:

```txt
backend/data/questions.json
backend/data/generation-requests.json
```

If the files do not exist, the backend creates them with an empty JSON array. If either file contains invalid JSON, the backend returns a clear file/database error so the file can be fixed.

## Main app workflow

### Create a question manually

1. Open the frontend.
2. Click `Create Question Manually`.
3. Fill in title, question, answer, category, and difficulty.
4. Click `Save`.
5. The app redirects to the new question detail page.

Required fields are title, question, answer, and difficulty.

### Open a question

1. Go to the main page.
2. Click `Open` on a question card.
3. The detail page shows the question while keeping the answer hidden.

### Reveal the answer

1. Open a question.
2. Click `Show Answer`.
3. The answer appears along with right/wrong and navigation buttons.

### Mark right or wrong

After revealing the answer:

- Click `I got it right` to increment `correctCount` and `timesSeen`.
- Click `I got it wrong` to increment `wrongCount` and `timesSeen`.

Both actions update `lastAnsweredAt` and `updatedAt`.

Accuracy is calculated in the frontend:

```ts
accuracy = timesSeen === 0 ? 0 : Math.round((correctCount / timesSeen) * 100);
```

### Previous and next navigation

After revealing an answer, use `Previous` and `Next` to move through the question list. Navigation loops around at the beginning and end.

### Edit a question

1. Click `Edit` from the list or detail page.
2. Update the fields.
3. Click `Save Changes`.
4. The app redirects back to the detail page.

Saving edits updates `updatedAt` and preserves stats.

### Delete a question

You can delete from the list page or from the edit page.

The app asks for confirmation before deleting. After deletion from the edit page, it redirects to the main page.

## Generation request workflow

The `Generate Question` button does not call OpenAI. It creates a local generation request.

1. Click `Generate Question` on the list or detail page.
2. Enter topic, category, and difficulty.
3. Click `Create Generation Request`.
4. The backend saves the request in:

```txt
backend/data/generation-requests.json
```

The app then shows this message:

```txt
Generation request saved. Use Codex/ChatGPT with the prompt in prompts/codex-generate-question.md to generate and save the question.
```

To process a request during development, use Codex/ChatGPT with:

```txt
prompts/codex-generate-question.md
```

That prompt instructs Codex/ChatGPT to:

- Read existing questions.
- Read the latest pending generation request.
- Generate one non-duplicate study question.
- Add it to `backend/data/questions.json`.
- Mark the request as completed.
- Avoid modifying frontend or backend code unless fixing a bug.

The reusable question-generation rules are in:

```txt
prompts/question-generation.prompt.md
```

## Backend scripts

From `backend/`:

```bash
npm run dev      # run backend in development mode
npm run build    # compile TypeScript
npm start        # run compiled backend from dist/
```

## Frontend scripts

From `frontend/`:

```bash
npm start        # run Angular dev server
npm run build    # build Angular app
```

## Notes about ChatGPT subscriptions and API billing

A ChatGPT subscription gives you access to ChatGPT products, but it is not a runtime API credential for a local app. This project therefore does not ask for an OpenAI API key and does not attempt browser automation against ChatGPT.

The backend includes a `QuestionGeneratorService` interface so a real API-based generator can be plugged in later if you explicitly decide to use API billing.
