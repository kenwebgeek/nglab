import { Component, signal } from '@angular/core';
import { BreadcrumbBarComponent } from './shared/breadcrumb-bar/breadcrumb-bar.component';
import { SidebarComponent } from './shared/sidebar/sidebar.component';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    imports: [BreadcrumbBarComponent, SidebarComponent, RouterOutlet]
})
export class AppComponent {
  title = 'Angular Lab';
  readonly isDarkMode = signal(false);

  toggleDarkMode() {
    this.isDarkMode.update(isDark => !isDark);
  }
}
