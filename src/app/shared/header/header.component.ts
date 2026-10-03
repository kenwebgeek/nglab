import { Component, EventEmitter, Output } from '@angular/core';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    standalone: false
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
