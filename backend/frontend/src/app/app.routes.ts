import { Routes } from '@angular/router';
import { QuestionFormComponent } from './pages/question-form/question-form.component';
import { QuestionListComponent } from './pages/question-list/question-list.component';

export const routes: Routes = [
  { path: '', component: QuestionListComponent },
  { path: 'questions/new', component: QuestionFormComponent },
  { path: 'questions/:id', component: QuestionListComponent },
  { path: 'questions/:id/edit', component: QuestionFormComponent },
  { path: '**', redirectTo: '' },
];
