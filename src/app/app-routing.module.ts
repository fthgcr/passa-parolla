import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainComponent } from './pages/main/main.component';
import { PyramidComponent } from './pages/pyramid/pyramid.component';

const routes: Routes = [
  { path: '', component: MainComponent },
  { path: 'piramit', component: PyramidComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
