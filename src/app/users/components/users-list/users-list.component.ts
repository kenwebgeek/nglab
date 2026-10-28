import { Component, computed, input, output, inject } from '@angular/core';
import { User } from '../../models/user.interface';
import { CommonService } from 'src/app/shared/common.service';
import { ViewActions } from '../../enums/view-actions.enum';
import { MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';

import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';

@Component({
    selector: 'app-users-list',
    templateUrl: './users-list.component.html',
    imports: [RouterLink, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatIcon, MatMenu, MatMenuItem, MatMenuTrigger, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow]
})
export class UsersListComponent {
  private readonly commonService = inject(CommonService);

  readonly headers = input<Array<{ headerName: string, fieldName: keyof User }>>([]);
  readonly users = input<ReadonlyArray<User>>([]);
  readonly user = output<{ user: User, action: ViewActions }>();
  readonly headerFields = computed(() => ['name', ...this.headers().map(data => data.fieldName), 'actions']);

  alertMessage = '';
  alertType = '';

  isLoading = false;
  shouldShowAlert = false;

  reloadPage() {
    window.location.reload();
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
