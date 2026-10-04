import { Component, Input, OnInit } from '@angular/core';


@Component({
    selector: 'app-alerts',
    templateUrl: './alerts.component.html'
})
export class AlertsComponent implements OnInit {
  @Input() alert: string;
  @Input() message: string;

  shouldShowSuccessAlert = false;

  ngOnInit() {
    this.shouldShowSuccessAlert = this.alert === 'success';
  }
}
