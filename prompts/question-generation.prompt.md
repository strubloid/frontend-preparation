# Question Generation Prompt

Generate exactly one study question for my Question Trainer app.

Return only valid JSON.

Use this format:

{
  "title": "Short title",
  "question": "Clear question text",
  "answer": "Detailed but simple answer",
  "category": "frontend | backend | database | security | architecture | interview | general",
  "difficulty": "easy | medium | hard"
}

Rules:
- Do not use markdown.
- Do not wrap the JSON in code fences.
- The question must be useful for software engineering study.
- Prefer practical interview-style questions.
- Avoid duplicated questions.
- Keep the title short.
- The answer should be clear enough that I can study from it.
