import { Component, computed, input, output, inject } from '@angular/core';
import { User } from '../../models/user.interface';
import { CommonService } from 'src/app/shared/common.service';
import { ViewActions } from '../../enums/view-actions.enum';
import { MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';

import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
    selector: 'app-users-list',
    templateUrl: './users-list.component.html',
    imports: [MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatButton, MatIcon, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow]
})
export class UsersListComponent {
  private readonly commonService = inject(CommonService);

  readonly headers = input<Array<{ headerName: string, fieldName: keyof User }>>([]);
  readonly users = input<ReadonlyArray<User>>([]);
  readonly user = output<{ user: User, action: ViewActions }>();
  readonly headerFields = computed(() => [...this.headers().map(data => data.fieldName), 'actions']);

  alertMessage = '';
  alertType = '';

  isLoading = false;
  shouldShowAlert = false;

  reloadPage() {
    window.location.reload();
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
