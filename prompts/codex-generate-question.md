# Codex Task: Generate One Question

You are working inside my local `question-trainer` project.

Task:

1. Read `backend/data/questions.json`.
2. Read the latest pending request from `backend/data/generation-requests.json`.
3. Generate one new study question based on the request.
4. Use the rules from `prompts/question-generation.prompt.md`.
5. Avoid duplicating existing questions.
6. Add the new question to `backend/data/questions.json`.
7. Mark the generation request as completed.
8. Preserve valid JSON formatting.
9. Do not modify frontend code.
10. Do not modify backend code unless required to fix a bug.

The generated question must follow this structure:

{
  "id": "generated uuid",
  "title": "Short title",
  "question": "Clear question text",
  "answer": "Detailed but simple answer",
  "category": "frontend",
  "difficulty": "medium",
  "timesSeen": 0,
  "correctCount": 0,
  "wrongCount": 0,
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}

After completing, summarize:
- The question title added
- The category
- The difficulty
- Which generation request was completed
