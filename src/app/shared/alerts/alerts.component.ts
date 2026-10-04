import { Component, computed, input } from '@angular/core';

@Component({
    selector: 'app-alerts',
    templateUrl: './alerts.component.html'
})
export class AlertsComponent {
  readonly alert = input<string>();
  readonly message = input<string>();

  readonly shouldShowSuccessAlert = computed(() => this.alert() === 'success');
}
