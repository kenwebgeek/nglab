import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { SessionStore } from '../auth/state/session.store';
import { User } from '../users/models/user.interface';
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

  it('confirms account deletion, then ends the session only after success', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate');
    component.confirmingDelete.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dialog').open).toBeTrue();
    component.deleteAccount();
    const request = http.expectOne('http://localhost:3000/users/1');
    expect(request.request.method).toBe('DELETE');
    expect(TestBed.inject(SessionStore).user()).toEqual(tony);
    request.flush({});
    expect(TestBed.inject(SessionStore).user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('keeps the session and shows an error when account deletion fails', () => {
    component.deleteAccount();
    http.expectOne('http://localhost:3000/users/1').flush({}, { status: 500, statusText: 'Server Error' });
    expect(TestBed.inject(SessionStore).user()).toEqual(tony);
    expect(component.notice()?.type).toBe('error');
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
