import { Component, input, output } from '@angular/core';

@Component({
    selector: 'app-breadcrumb-bar',
    templateUrl: './breadcrumb-bar.component.html',
})
export class BreadcrumbBarComponent {
  readonly isDarkMode = input(false);
  readonly darkModeToggled = output<void>();
}
