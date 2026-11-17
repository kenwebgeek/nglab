import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SignupFormComponent } from '../../components/signup-form/signup-form.component';
import { AuthStore } from '../../state/auth.store';

@Component({
    selector: 'app-signup-page',
    templateUrl: './signup-page.component.html',
    host: { class: 'flex w-full flex-col items-center gap-6' },
    imports: [RouterLink, SignupFormComponent]
})
export class SignupPageComponent implements OnInit {
  readonly store = inject(AuthStore);

  ngOnInit(): void {
    // Drop an error left over from an earlier visit
    this.store.dismissError();
  }
}
