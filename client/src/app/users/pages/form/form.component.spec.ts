import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { User } from '../../models/user.interface';
import { UsersStore, Notice } from '../../state/users.store';
import { FormComponent } from './form.component';
import { SessionStore } from '../../../auth/state/session.store';

const tony: User = { id: 1, firstName: 'Tony', lastName: 'Stark', nickname: 'Iron Man', email: 'tony@avengers.com' };

describe('FormComponent', () => {
  let component: FormComponent;
  let fixture: ComponentFixture<FormComponent>;
  let store: {
    users: ReturnType<typeof signal<ReadonlyArray<User>>>,
    notice: ReturnType<typeof signal<Notice | null>>,
    add: jasmine.Spy,
    update: jasmine.Spy,
    load: jasmine.Spy,
    dismissNotice: jasmine.Spy
  };

  beforeEach(async () => {
    store = {
      users: signal([tony]),
      notice: signal<Notice | null>(null),
      add: jasmine.createSpy('add'),
      update: jasmine.createSpy('update'),
      load: jasmine.createSpy('load'),
      dismissNotice: jasmine.createSpy('dismissNotice'),
    };

    await TestBed.configureTestingModule({
      imports: [ FormComponent ],
      providers: [provideRouter([]), { provide: UsersStore, useValue: store },
        { provide: SessionStore, useValue: { user: signal(null) } }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should not load users when creating a new user', () => {
    store.users.set([]);
    fixture.detectChanges();
    expect(store.load).not.toHaveBeenCalled();
  });

  it('should navigate back to the list when the form is closed', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    component.closeForm();
    expect(navigate).toHaveBeenCalledWith(['/users']);
  });

  it('should show a failed save inside the form and clear it when the form is closed', () => {
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    store.notice.set({ type: 'error', message: 'Unable to add the user. Please try again.' });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role=alert]')?.textContent)
      .toContain('Unable to add the user');

    component.closeForm();
    expect(store.dismissNotice).toHaveBeenCalled();
  });

  it('should add a submitted user', () => {
    component.createUser(tony);
    expect(store.add).toHaveBeenCalledWith(tony);
  });
});
