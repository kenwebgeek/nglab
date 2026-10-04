import { Component, OnInit, computed, inject, input } from '@angular/core';
import { User } from '../../models/user.interface';
import { UsersStore } from '../../state/users.store';
import { UserFormComponent } from '../../components/user-form/user-form.component';

@Component({
    selector: 'app-form',
    templateUrl: './form.component.html',
    imports: [UserFormComponent]
})
export class FormComponent implements OnInit {
  private readonly store = inject(UsersStore);

  // Bound from the `:id` route param
  readonly id = input<string>();

  readonly user = computed(() => {
    const id = Number(this.id());
    return this.store.users().find(data => data.id === id) ?? null;
  });

  ngOnInit(): void {
    // Direct visits to /manage/:id start with an empty store
    if (this.id() && !this.user()) {
      this.store.load();
    }
  }

  formAction(data: { value: User, action: string }) {
    console.log(data);
    switch (data.action) {
      case 'Create':
        this.store.add(data.value);
        break;
      case 'Update':
        this.store.update(data.value);
        break;
      default: '';
        break;
    }
  }
}
