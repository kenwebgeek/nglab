import { Component, EventEmitter, Output } from '@angular/core';
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
  @Output() colorMode = new EventEmitter<string>();
  colorModeIcon = 'dark_mode';

  toggleColorMode(e: any) {
    const { target } = e;
    const iconValue: string = target!.dataset.matIconName;

    this.colorMode.emit(iconValue);
    iconValue === 'dark_mode'
      ? this.colorModeIcon = 'light_mode'
      : this.colorModeIcon = 'dark_mode';
  }
}
