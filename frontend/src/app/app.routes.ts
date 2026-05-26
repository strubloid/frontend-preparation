import { Routes } from '@angular/router';
import { QuestionDetailComponent } from './pages/question-detail/question-detail.component';
import { QuestionFormComponent } from './pages/question-form/question-form.component';
import { QuestionListComponent } from './pages/question-list/question-list.component';

export const routes: Routes = [
  { path: '', component: QuestionListComponent },
  { path: 'questions/new', component: QuestionFormComponent },
  { path: 'questions/:id', component: QuestionDetailComponent },
  { path: 'questions/:id/edit', component: QuestionFormComponent },
  { path: '**', redirectTo: '' },
];
