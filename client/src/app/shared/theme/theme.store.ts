import { Injectable, signal } from '@angular/core';

// Shared by every layout, because the `dark` class is set once on the root app template
@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly _isDarkMode = signal(false);
  readonly isDarkMode = this._isDarkMode.asReadonly();

  toggle() {
    this._isDarkMode.update(isDark => !isDark);
  }
}
