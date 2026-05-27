import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import path from "path";
import { QuestionFileDbService } from "./services/question-file-db.service.js";
import { LocalQuestionGeneratorService } from "./services/question-generator.service.js";
import { isValidDifficulty, validateGenerationRequestBody, validateQuestionBody } from "./validation.js";
import { AnswerResult, QuestionInput } from "./models/question.model.js";
import { GenerationRequestInput } from "./models/generation-request.model.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

const questionDb = new QuestionFileDbService();
const questionGeneratorService = new LocalQuestionGeneratorService(questionDb);

app.use(cors());
app.use(express.json());

// Serve static frontend files
const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));

app.get("/api/health", (_request, response) => {
    response.json({ status: "ok" });
});

app.get("/api/questions", async (_request, response, next) => {
    try {
        response.json(await questionDb.getAll());
    } catch (error) {
        next(error);
    }
});

app.get("/api/questions/:id", async (request, response, next) => {
    try {
        const question = await questionDb.getById(request.params.id);

        if (!question) {
            response.status(404).json({ message: "Question not found." });
            return;
        }

        response.json(question);
    } catch (error) {
        next(error);
    }
});

app.post("/api/questions", async (request, response, next) => {
    try {
        const validationError = validateQuestionBody(request.body);
        if (validationError) {
            response.status(400).json({ message: validationError });
            return;
        }

        const body = request.body as QuestionInput;
        const question = await questionDb.create(body);
        response.status(201).json(question);
    } catch (error) {
        next(error);
    }
});

app.put("/api/questions/:id", async (request, response, next) => {
    try {
        const validationError = validateQuestionBody(request.body);
        if (validationError) {
            response.status(400).json({ message: validationError });
            return;
        }

        const updatedQuestion = await questionDb.update(request.params.id, request.body as QuestionInput);

        if (!updatedQuestion) {
            response.status(404).json({ message: "Question not found." });
            return;
        }

        response.json(updatedQuestion);
    } catch (error) {
        next(error);
    }
});

app.delete("/api/questions/:id", async (request, response, next) => {
    try {
        const deleted = await questionDb.delete(request.params.id);

        if (!deleted) {
            response.status(404).json({ message: "Question not found." });
            return;
        }

        response.status(204).send();
    } catch (error) {
        next(error);
    }
});

app.patch("/api/questions/:id/result", async (request, response, next) => {
    try {
        const result = (request.body as { result?: unknown }).result;
        if (result !== "right" && result !== "wrong") {
            response.status(400).json({ message: "result must be right or wrong." });
            return;
        }

        const updatedQuestion = await questionDb.markResult(request.params.id, result as AnswerResult);

        if (!updatedQuestion) {
            response.status(404).json({ message: "Question not found." });
            return;
        }

        response.json(updatedQuestion);
    } catch (error) {
        next(error);
    }
});

app.post("/api/generation-requests", async (request, response, next) => {
    try {
        const validationError = validateGenerationRequestBody(request.body);
        if (validationError) {
            response.status(400).json({ message: validationError });
            return;
        }

        const body = request.body as GenerationRequestInput;
        if (!isValidDifficulty(body.difficulty)) {
            response.status(400).json({ message: "difficulty must be easy, medium, or hard." });
            return;
        }

        const generatedQuestion = await questionGeneratorService.createQuestionFromTopic(body);
        response.status(201).json(generatedQuestion);
    } catch (error) {
        next(error);
    }
});

// Fallback route for Angular SPA - serve index.html for all non-API routes
app.get("/{*path}", (_request, response) => {
    response.sendFile(path.join(publicPath, "index.html"));
});

app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
    console.error(error);
    response.status(500).json({ message: error.message || "File/database error." });
});

app.listen(port, () => {
    console.log(`Question Trainer backend running on http://localhost:${port}`);
});
