import { Component, ElementRef, afterRenderEffect, computed, input, output, inject } from '@angular/core';
import { User } from '../../models/user.interface';
import { Notice } from '../../state/users.store';
import { CommonService } from 'src/app/shared/common.service';
import { AlertsComponent } from '../../../shared/alerts/alerts.component';
import { ViewActions } from '../../enums/view-actions.enum';
import { MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';

import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-users-list',
    templateUrl: './users-list.component.html',
    imports: [RouterLink, AlertsComponent, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow]
})
export class UsersListComponent {
  private readonly commonService = inject(CommonService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly headers = input<Array<{ headerName: string, fieldName: keyof User }>>([]);
  readonly users = input<ReadonlyArray<User>>([]);
  readonly currentUserId = input<number | null>(null);
  // Row to mark as the target of a pending destructive action
  readonly highlightedUserId = input<number | null>(null);
  // Row whose edit form is open
  readonly editingUserId = input<number | null>(null);
  // Row of a just-created user
  readonly addedUserId = input<number | null>(null);
  readonly notice = input<Notice | null>(null);
  readonly noticeDismissed = output<void>();
  readonly user = output<{ user: User, action: ViewActions }>();
  readonly headerFields = computed(() => ['name', ...this.headers().map(data => data.fieldName), 'actions']);

  alertMessage = '';
  alertType = '';

  isLoading = false;
  shouldShowAlert = false;

  constructor() {
    afterRenderEffect(() => {
      const id = this.addedUserId();
      if (id !== null) {
        this.host.nativeElement.querySelector(`[data-user-id="${id}"]`)
          ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  reloadPage() {
    window.location.reload();
  }

  // The highlight replaces the hover colours so it stays visible under the pointer
  rowClass(user: User): string {
    if (user.id === this.highlightedUserId()) {
      return 'bg-red-50 dark:bg-red-500/10';
    }
    if (user.id === this.editingUserId()) {
      return 'bg-blue-50 dark:bg-blue-500/10';
    }
    if (user.id === this.addedUserId()) {
      return 'bg-green-50 dark:bg-green-500/10';
    }
    return 'bg-transparent hover:bg-slate-50 dark:hover:bg-[#111827]';
  }

  initials(user: User): string {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  }

  selectUser(user: User, action: ViewActions) {
    this.user.emit({user, action});
  }

  /**
   * Show alert message depending on the alert type
   * @param alertType Determines which alert to show
   * @param message Sets the message to display
   */
  showAlert(alertType: string, message: string) {
    alertType === 'success' ? this.alertType = 'success' : this.alertType = 'error';

    this.alertMessage = message;
    this.commonService.scrollToTop();
    this.shouldShowAlert = true;

    // Handle alert
    setTimeout(() => {
      this.isLoading = false;

      setTimeout(() => {
        this.shouldShowAlert = false;
      }, 3000);
    }, 1000);
  }
}
