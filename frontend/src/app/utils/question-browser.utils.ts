import { Question } from '../models/question.model';

export interface QuestionCardViewModel extends Question {
  accuracy: number;
  categoryLabel: string;
  categorySlug: string;
}

export interface QuestionCategoryFilter {
  averageAccuracy: number;
  count: number;
  label: string;
  slug: string;
}

export interface QuestionCollectionStats {
  overallAccuracy: number;
  totalAnswered: number;
  totalCategories: number;
  totalQuestions: number;
}

export interface QuestionBrowserData {
  categories: QuestionCategoryFilter[];
  questions: QuestionCardViewModel[];
  stats: QuestionCollectionStats;
}

export function buildQuestionBrowserData(questions: Question[]): QuestionBrowserData {
  const categoryMap = new Map<string, Question[]>();

  for (const question of questions) {
    const categorySlug = normalizeCategory(question.category);
    const categoryQuestions = categoryMap.get(categorySlug) ?? [];
    categoryMap.set(categorySlug, [...categoryQuestions, question]);
  }

  const categories = Array.from(categoryMap.entries()).map(([slug, categoryQuestions]) => {
    const totalAttempts = categoryQuestions.reduce((sum, question) => sum + question.timesSeen, 0);
    const totalCorrect = categoryQuestions.reduce((sum, question) => sum + question.correctCount, 0);

    return {
      averageAccuracy: totalAttempts === 0 ? 0 : Math.round((totalCorrect / totalAttempts) * 100),
      count: categoryQuestions.length,
      label: formatCategoryLabel(categoryQuestions[0]?.category ?? ''),
      slug,
    } satisfies QuestionCategoryFilter;
  });

  const questionsWithMeta = questions.map((question) => ({
    ...question,
    accuracy: calculateAccuracy(question),
    categoryLabel: formatCategoryLabel(question.category),
    categorySlug: normalizeCategory(question.category),
  } satisfies QuestionCardViewModel));

  const totalAnswered = questionsWithMeta.reduce((sum, question) => sum + question.timesSeen, 0);
  const totalCorrect = questionsWithMeta.reduce((sum, question) => sum + question.correctCount, 0);

  return {
    categories,
    questions: questionsWithMeta,
    stats: {
      overallAccuracy: totalAnswered === 0 ? 0 : Math.round((totalCorrect / totalAnswered) * 100),
      totalAnswered,
      totalCategories: categories.length,
      totalQuestions: questionsWithMeta.length,
    },
  };
}

export function calculateAccuracy(question: Pick<Question, 'correctCount' | 'timesSeen'>): number {
  return question.timesSeen === 0 ? 0 : Math.round((question.correctCount / question.timesSeen) * 100);
}

export function findQuestionIndexById(questions: QuestionCardViewModel[], questionId: string): number {
  return questions.findIndex((question) => question.id === questionId);
}

export function getQuestionByOffset(
  questions: QuestionCardViewModel[],
  currentQuestionId: string,
  offset: number,
): QuestionCardViewModel | undefined {
  if (questions.length === 0) {
    return undefined;
  }

  const currentIndex = findQuestionIndexById(questions, currentQuestionId);
  const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (safeCurrentIndex + offset + questions.length) % questions.length;
  return questions[nextIndex];
}

export function normalizeCategory(category: string): string {
  const trimmedCategory = category.trim().toLowerCase();
  const fallbackCategory = trimmedCategory || 'general';
  return fallbackCategory.replace(/[^a-z0-9]+/g, '-');
}

export function formatCategoryLabel(category: string): string {
  const safeCategory = category.trim() || 'general';

  return safeCategory
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
}
