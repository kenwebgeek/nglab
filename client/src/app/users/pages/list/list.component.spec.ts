import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { User } from '../../models/user.interface';
import { UsersStore } from '../../state/users.store';
import { ListComponent } from './list.component';
import { SessionStore } from '../../../auth/state/session.store';

const users: User[] = [
  { id: 1, firstName: 'Tony', lastName: 'Stark', nickname: 'Iron Man', email: 'tony@avengers.com' },
  { id: 2, firstName: 'Natasha', lastName: 'Romanoff', nickname: 'Black Widow', email: 'nat@avengers.com' },
];

describe('ListComponent', () => {
  let component: ListComponent;
  let fixture: ComponentFixture<ListComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ListComponent ],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    http.expectOne('http://localhost:3000/users').flush([]);
    expect(component).toBeTruthy();
  });

  it('should load and display the users', () => {
    http.expectOne('http://localhost:3000/users').flush(users);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('tr[mat-row]').length).toBe(2);
  });

  it('should display the currently logged-in user first without changing store order', () => {
    TestBed.inject(SessionStore).setUser(users[1]);
    http.expectOne('http://localhost:3000/users').flush(users);
    fixture.detectChanges();

    const names: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('td.mat-column-name'));
    expect(names[0].textContent).toContain('Natasha Romanoff');
    expect(names[1].textContent).toContain('Tony Stark');
    expect(component.users()).toEqual(users);
  });

  it('should ask for confirmation before deleting and remove the user once confirmed', () => {
    http.expectOne('http://localhost:3000/users').flush(users);

    component.selectUser(users[0]);
    fixture.detectChanges();

    http.expectNone('http://localhost:3000/users/1');
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    expect(dialog.open).toBeTrue();
    expect(dialog.textContent).toContain('Are you sure you want to delete Tony Stark?');
    const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row]'));
    expect(rows[0].classList).toContain('bg-red-50');
    expect(rows[1].classList).not.toContain('bg-red-50');

    component.confirmDelete();
    fixture.detectChanges();
    http.expectOne('http://localhost:3000/users/1').flush({});

    expect(component.users()).toEqual([users[1]]);
    dialog.dispatchEvent(new Event('animationend'));
    expect(dialog.open).toBeFalse();
  });

  it('should keep the user when the delete prompt is cancelled', () => {
    http.expectOne('http://localhost:3000/users').flush(users);

    component.selectUser(users[0]);
    fixture.detectChanges();
    component.cancelDelete();
    fixture.detectChanges();

    http.expectNone('http://localhost:3000/users/1');
    expect(component.users()).toEqual(users);
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    dialog.dispatchEvent(new Event('animationend'));
    expect(dialog.open).toBeFalse();
    expect(fixture.nativeElement.querySelector('tr[mat-row]').classList).not.toContain('bg-red-50');
  });
});

@Component({ template: '' })
class StubFormComponent {}

describe('ListComponent row highlights and notices', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'users', component: ListComponent, children: [{ path: 'manage', component: StubFormComponent }] },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  const rows = () => Array.from(harness.routeNativeElement!.querySelectorAll('tr[mat-row]')) as HTMLElement[];

  it('should highlight a newly added row in green and show the success message above the list', async () => {
    await harness.navigateByUrl('/users', ListComponent);
    http.expectOne('http://localhost:3000/users').flush(users);

    const store = TestBed.inject(UsersStore);
    store.add({ firstName: 'Bruce', lastName: 'Banner', email: 'bruce@avengers.com' } as User);
    http.expectOne({ method: 'POST', url: 'http://localhost:3000/users' })
      .flush({ id: 3, firstName: 'Bruce', lastName: 'Banner', email: 'bruce@avengers.com' });
    harness.detectChanges();

    expect(rows()[2].classList).toContain('bg-green-50');
    expect(harness.routeNativeElement!.querySelector('[role=status]')?.textContent).toContain('Bruce Banner was added.');
  });

  it('should show an error message when an action fails', async () => {
    await harness.navigateByUrl('/users', ListComponent);
    http.expectOne('http://localhost:3000/users').flush(users);

    TestBed.inject(UsersStore).remove(1);
    http.expectOne('http://localhost:3000/users/1').flush('error', { status: 500, statusText: 'Server Error' });
    harness.detectChanges();

    expect(harness.routeNativeElement!.querySelector('[role=alert]')?.textContent).toContain('Unable to delete the user');
    expect(rows().length).toBe(2);
  });
});
