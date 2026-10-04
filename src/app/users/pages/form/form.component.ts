import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { User } from '../../models/user.interface';
import { AppState } from 'src/app/state/app.state';
import { selectUser } from '../../state/user.selectors';
import { UserActions } from '../../state/user.actions';
import { UserFormComponent } from '../../components/user-form/user-form.component';

@Component({
    selector: 'app-form',
    templateUrl: './form.component.html',
    imports: [UserFormComponent]
})
export class FormComponent implements OnInit {
  user$: Observable<User | undefined>;
  user: User | null = null;

  constructor(private router: ActivatedRoute, private store: Store<AppState>) {
    const id = +this.router.snapshot.params['id'];
    this.user$ = this.store.select(selectUser(id));
    this.user$.subscribe(data => {
      if (data) this.user = data;
    });
  }

  ngOnInit(): void { }

  formAction(data: { value: User, action: string }) {
    console.log(data);
    switch (data.action) {
      case 'Create':
        this.store.dispatch({ type: UserActions.ADD_USER_API, payload: data.value });
        break;
      case 'Update':
        this.store.dispatch({ type: UserActions.MODIFY_USER_API, payload: data.value });
        break;
      default: '';
        break;
    }
  }
}
