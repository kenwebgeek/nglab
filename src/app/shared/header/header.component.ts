import { Component, output, signal } from '@angular/core';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIcon } from '@angular/material/icon';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    imports: [MatToolbar, MatIcon, MatMenuTrigger, MatMenu, MatMenuItem, RouterLink]
})
export class HeaderComponent {
  readonly colorMode = output<string>();
  readonly colorModeIcon = signal('dark_mode');

  toggleColorMode(e: any) {
    const { target } = e;
    const iconValue: string = target!.dataset.matIconName;

    this.colorMode.emit(iconValue);
    this.colorModeIcon.set(iconValue === 'dark_mode' ? 'light_mode' : 'dark_mode');
  }
}
