import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BreadcrumbBarComponent } from '../shared/breadcrumb-bar/breadcrumb-bar.component';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { ThemeStore } from '../shared/theme/theme.store';

// The signed-in application chrome: sidebar and breadcrumb bar around the routed page
@Component({
    selector: 'app-shell-layout',
    templateUrl: './shell-layout.component.html',
    host: { class: 'block h-full' },
    imports: [BreadcrumbBarComponent, SidebarComponent, RouterOutlet]
})
export class ShellLayoutComponent {
  readonly theme = inject(ThemeStore);
}
