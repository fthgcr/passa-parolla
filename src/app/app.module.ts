import { NgModule } from '@angular/core';
import {
  BrowserModule,
  provideClientHydration,
} from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MainComponent } from './pages/main/main.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { EndGameComponent } from './pages/end-game/end-game.component';
import { StartGameComponent } from './pages/start-game/start-game.component';
import { PyramidComponent } from './pages/pyramid/pyramid.component';
import { MenuComponent } from './pages/menu/menu.component';
import { GizliKelimeComponent } from './pages/gizli-kelime/gizli-kelime.component';
import { KlasikComponent } from './pages/klasik/klasik.component';

@NgModule({
  declarations: [
    AppComponent,
    MainComponent,
    EndGameComponent,
    StartGameComponent,
    PyramidComponent,
    MenuComponent,
    GizliKelimeComponent,
    KlasikComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule
  ],
  providers: [provideClientHydration(), provideAnimationsAsync()],
  bootstrap: [AppComponent],
})
export class AppModule {}
