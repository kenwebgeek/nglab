import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeStore } from './shared/theme/theme.store';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    imports: [RouterOutlet]
})
export class AppComponent {
  title = 'Angular Lab';
  readonly theme = inject(ThemeStore);
}
