import { Component, computed, input, output } from '@angular/core';

@Component({
    selector: 'app-alerts',
    templateUrl: './alerts.component.html',
    // Animates height as well (via grid rows), so the content below eases into place; the parent adds `animate.leave`.
    // No `grid-rows-*` utility here: every utility is !important and would override the animated value
    host: { class: 'grid animate-alert-in motion-reduce:animate-none' }
})
export class AlertsComponent {
  readonly alert = input<'success' | 'error'>('error');
  readonly message = input<string>();
  // Classes for the spacing around the alert, kept inside so it collapses with the animation
  readonly spacing = input('');
  readonly dismissed = output<void>();

  readonly shouldShowSuccessAlert = computed(() => this.alert() === 'success');
}
