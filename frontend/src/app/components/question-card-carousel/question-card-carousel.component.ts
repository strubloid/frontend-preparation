import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuestionCardViewModel } from '../../utils/question-browser.utils';

@Component({
  selector: 'app-question-card-carousel',
  imports: [RouterLink],
  templateUrl: './question-card-carousel.component.html',
  styleUrl: './question-card-carousel.component.scss',
})
export class QuestionCardCarouselComponent {
  @Input({ required: true }) question?: QuestionCardViewModel;
  @Input({ required: true }) position = 0;
  @Input({ required: true }) total = 0;

  @Output() openDetail = new EventEmitter<void>();
  @Output() previous = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();

  triggerOpenDetail(): void {
    this.openDetail.emit();
  }
}
