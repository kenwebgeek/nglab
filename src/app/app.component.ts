import { Component } from '@angular/core';
import { HeaderComponent } from './shared/header/header.component';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    imports: [HeaderComponent, RouterOutlet]
})
export class AppComponent {
  title = 'Angular Lab';
  colorMode = '';

  setColorMode(mode: string) {
    this.colorMode = mode;
  }
}
