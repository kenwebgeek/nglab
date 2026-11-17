import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

// Full-page chrome for the signed-out pages (sign up now, log in later)
@Component({
    selector: 'app-auth-layout',
    templateUrl: './auth-layout.component.html',
    host: { class: 'block h-full' },
    imports: [RouterOutlet]
})
export class AuthLayoutComponent {}
