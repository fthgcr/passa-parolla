import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainComponent } from './pages/main/main.component';
import { PyramidComponent } from './pages/pyramid/pyramid.component';
import { MenuComponent } from './pages/menu/menu.component';
import { GizliKelimeComponent } from './pages/gizli-kelime/gizli-kelime.component';

const routes: Routes = [
  { path: '', component: MenuComponent },
  { path: 'passaparola', component: MainComponent },
  { path: 'piramit', component: PyramidComponent },
  { path: 'gizli-kelime', component: GizliKelimeComponent },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
