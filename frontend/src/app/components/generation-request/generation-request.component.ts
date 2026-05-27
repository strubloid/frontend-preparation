import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { QuestionDifficulty } from '../../models/question.model';
import { QuestionService } from '../../services/question.service';

@Component({
  selector: 'app-generation-request',
  imports: [ReactiveFormsModule],
  templateUrl: './generation-request.component.html',
  styleUrl: './generation-request.component.scss',
})
export class GenerationRequestComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly questionService = inject(QuestionService);

  @Output() closeForm = new EventEmitter<void>();

  readonly difficulties: QuestionDifficulty[] = ['easy', 'medium', 'hard'];
  readonly message = signal('');
  readonly error = signal('');
  readonly isSubmitting = signal(false);

  readonly form = this.formBuilder.nonNullable.group({
    topic: ['', Validators.required],
    category: ['frontend'],
    difficulty: ['medium' as QuestionDifficulty, Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.error.set('');
    this.message.set('');

    this.questionService.createGenerationRequest(this.form.getRawValue()).subscribe({
      next: (question) => {
        this.message.set(`Question created: ${question.title}`);
        this.form.reset({ topic: '', category: 'frontend', difficulty: 'medium' });
        this.isSubmitting.set(false);
        this.closeForm.emit();
      },
      error: () => {
        this.error.set('Could not generate a question. Make sure the backend is running.');
        this.isSubmitting.set(false);
      },
    });
  }
}
