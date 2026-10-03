import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { User } from '../../models/user.interface';
import { CommonService } from 'src/app/shared/common.service';
import { ViewActions } from '../../enums/view-actions.enum';

@Component({
    selector: 'app-users-list',
    templateUrl: './users-list.component.html',
    standalone: false
})
export class UsersListComponent implements OnInit {
  @Input() headers: Array<{ headerName: string, fieldName: keyof User }> = [];
  @Input() users: ReadonlyArray<User> = [];
  @Output() user = new EventEmitter<{ user: User, action: ViewActions }>();
  headerFields: string[] = [];

  alertMessage = '';
  alertType = '';

  isLoading = false;
  shouldShowAlert = false;

  constructor(private commonService: CommonService) { }

  ngOnInit() {
    this.getHeaderFields();
  }

  getHeaderFields() {
    this.headerFields = this.headers.map(data => data.fieldName);
    this.headerFields.push('actions');
  }

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
