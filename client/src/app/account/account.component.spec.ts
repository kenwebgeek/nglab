import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { SessionStore } from '../auth/state/session.store';
import { User } from '../users/models/user.interface';
import { UsersStore } from '../users/state/users.store';
import { AccountComponent } from './account.component';

const tony: User = {
  id: 1,
  firstName: 'Tony',
  lastName: 'Stark',
  nickname: 'Iron Man',
  email: 'tony@avengers.com',
  currentActivity: 'Building suits',
};

describe('AccountComponent', () => {
  let fixture: ComponentFixture<AccountComponent>;
  let component: AccountComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    TestBed.inject(SessionStore).setUser(tony);
    fixture = TestBed.createComponent(AccountComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('loads the signed-in user into the profile form', () => {
    expect(component.profileForm.getRawValue()).toEqual({
      firstName: 'Tony',
      lastName: 'Stark',
      nickname: 'Iron Man',
      email: 'tony@avengers.com',
      currentActivity: 'Building suits',
    });
  });

  it('displays the admin tag only for an admin', () => {
    expect(fixture.nativeElement.querySelector('#account-access-heading').parentElement.textContent).not.toContain('Admin');
    TestBed.inject(SessionStore).setUser({ ...tony, admin: true });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#account-access-heading').parentElement.textContent).toContain('Admin');
  });

  it('confirms deletion, shows success only after the response, and redirects after three seconds', () => {
    jasmine.clock().install();
    try {
      const navigate = spyOn(TestBed.inject(Router), 'navigate');
      const users = TestBed.inject(UsersStore);
      users.load();
      http.expectOne('http://localhost:3000/users').flush([tony]);
      const section: HTMLElement = fixture.nativeElement.querySelector('section[aria-labelledby=delete-account-heading]');
      expect(section.textContent).toContain('Delete account');
      section.querySelector('button')!.click();
      fixture.detectChanges();
      const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
      expect(dialog.open).toBeTrue();
      expect(dialog.textContent).toContain('This action cannot be undone.');
      http.expectNone('http://localhost:3000/users/1');

      const confirm = Array.from(dialog.querySelectorAll('button')).find(button => button.textContent?.includes('Delete account'))!;
      confirm.click();
      component.deleteAccount();
      fixture.detectChanges();
      const request = http.expectOne('http://localhost:3000/users/1');
      expect(request.request.method).toBe('DELETE');
      expect(dialog.textContent).not.toContain('Your account has been deleted.');
      expect(Array.from(dialog.querySelectorAll('button')).every(button => button.disabled)).toBeTrue();
      dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
      expect(component.confirmingDelete()).toBeTrue();
      expect(TestBed.inject(SessionStore).user()).toEqual(tony);
      expect(users.users()).toEqual([tony]);
      request.flush({});
      fixture.detectChanges();
      expect(dialog.querySelector('[role=status]')?.textContent).toContain('Your account has been deleted.');
      expect(TestBed.inject(SessionStore).user()).toBeNull();
      expect(users.users()).toEqual([]);
      dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
      dialog.click();
      expect(component.confirmingDelete()).toBeTrue();
      expect(navigate).not.toHaveBeenCalled();
      jasmine.clock().tick(2999);
      expect(navigate).not.toHaveBeenCalled();
      jasmine.clock().tick(1);
      expect(navigate).toHaveBeenCalledWith(['/login']);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('keeps the session, shows an error in the dialog and allows a retry', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate');
    component.confirmingDelete.set(true);
    fixture.detectChanges();
    component.deleteAccount();
    http.expectOne('http://localhost:3000/users/1').flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(TestBed.inject(SessionStore).user()).toEqual(tony);
    expect(fixture.nativeElement.querySelector('dialog [role=alert]')?.textContent).toContain('Unable to delete your account');
    expect(navigate).not.toHaveBeenCalled();
    component.deleteAccount();
    http.expectOne('http://localhost:3000/users/1').flush({});
    expect(TestBed.inject(SessionStore).user()).toBeNull();
  });

  it('cancels account deletion without sending a request', () => {
    component.confirmingDelete.set(true);
    fixture.detectChanges();
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(component.confirmingDelete()).toBeFalse();
    http.expectNone('http://localhost:3000/users/1');
  });

  it('cancels the redirect timer if the page is destroyed', () => {
    jasmine.clock().install();
    try {
      const navigate = spyOn(TestBed.inject(Router), 'navigate');
      component.confirmingDelete.set(true);
      component.deleteAccount();
      http.expectOne('http://localhost:3000/users/1').flush({});
      fixture.destroy();
      jasmine.clock().tick(3000);
      expect(navigate).not.toHaveBeenCalled();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('updates the signed-in user without navigating away', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate');
    component.profileForm.patchValue({
      firstName: 'Anthony',
      nickname: 'The Inventor',
    });

    component.saveProfile();
    const request = http.expectOne('http://localhost:3000/users/1');
    expect(request.request.method).toBe('PUT');
    const updated = {
      id: 1,
      firstName: 'Anthony',
      lastName: 'Stark',
      nickname: 'The Inventor',
      email: 'tony@avengers.com',
      currentActivity: 'Building suits',
    };
    expect(request.request.body).toEqual(updated);
    request.flush(updated);

    expect(TestBed.inject(SessionStore).user()).toEqual(updated);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('cancels profile changes by restoring the signed-in user', () => {
    component.profileForm.patchValue({ firstName: 'Pepper' });
    component.resetProfile();

    expect(component.profileForm.controls.firstName.value).toBe('Tony');
  });

  it('masks passwords by default and toggles each field independently', () => {
    const inputs = {
      currentPassword: fixture.nativeElement.querySelector('#current-password') as HTMLInputElement,
      newPassword: fixture.nativeElement.querySelector('#new-password') as HTMLInputElement,
      confirmPassword: fixture.nativeElement.querySelector('#confirm-password') as HTMLInputElement,
    };
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('form[aria-label="Change password"] button'))
      .filter((button): button is HTMLButtonElement => button instanceof HTMLButtonElement && button.type === 'button');

    expect(Object.values(inputs).map(input => input.type)).toEqual(['password', 'password', 'password']);
    buttons[1].click();
    fixture.detectChanges();

    expect(inputs.currentPassword.type).toBe('password');
    expect(inputs.newPassword.type).toBe('text');
    expect(inputs.confirmPassword.type).toBe('password');
  });

  it('does not submit an invalid password change', () => {
    component.passwordForm.setValue({
      currentPassword: 'OldPassword1!',
      newPassword: 'short',
      confirmPassword: 'different',
    });

    component.updatePassword();

    http.expectNone('http://localhost:3000/auth/password');
    expect(component.passwordForm.touched).toBeTrue();
  });

  it('changes the password, signs out, and clears sensitive form state', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate');
    component.passwordForm.setValue({
      currentPassword: 'OldPassword1!',
      newPassword: 'NewPassword2!',
      confirmPassword: 'NewPassword2!',
    });
    component.visiblePasswordFields.set({
      currentPassword: true,
      newPassword: true,
      confirmPassword: false,
    });

    component.updatePassword();
    const request = http.expectOne('http://localhost:3000/auth/password');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      currentPassword: 'OldPassword1!',
      newPassword: 'NewPassword2!',
    });
    request.flush(null);

    expect(component.passwordForm.getRawValue()).toEqual({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    expect(component.passwordIsVisible('currentPassword')).toBeFalse();
    expect(component.passwordIsVisible('newPassword')).toBeFalse();
    expect(TestBed.inject(SessionStore).user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('shows a specific message when the current password is wrong', () => {
    component.passwordForm.setValue({
      currentPassword: 'WrongPassword1!',
      newPassword: 'NewPassword2!',
      confirmPassword: 'NewPassword2!',
    });

    component.updatePassword();
    http.expectOne('http://localhost:3000/auth/password').flush(
      { error: 'invalid_current_password' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(component.passwordNotice()).toEqual({
      type: 'error',
      message: 'Current password is incorrect.',
    });
    expect(component.passwordSubmitting()).toBeFalse();
  });
});
