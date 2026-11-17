import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AlertsComponent } from '../../../shared/alerts/alerts.component';
import { LoginFormComponent } from '../../components/login-form/login-form.component';
import { AuthStore } from '../../state/auth.store';

@Component({
    selector: 'app-login-page',
    templateUrl: './login-page.component.html',
    host: { class: 'flex w-full flex-col items-center gap-6' },
    imports: [RouterLink, AlertsComponent, LoginFormComponent]
})
export class LoginPageComponent implements OnInit {
  readonly store = inject(AuthStore);

  ngOnInit(): void {
    // Drop an error left over from an earlier visit; the sign-up notice is kept
    this.store.dismissError();
  }
}
