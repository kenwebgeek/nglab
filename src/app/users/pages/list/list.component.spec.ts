import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { User } from '../../models/user.interface';
import { ViewActions } from '../../enums/view-actions.enum';
import { ListComponent } from './list.component';

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

  it('should navigate to the form when viewing a user', () => {
    http.expectOne('http://localhost:3000/users').flush(users);
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    component.selectUser({ user: users[0], action: ViewActions.View });

    expect(navigate).toHaveBeenCalledWith(['users', 'manage', 1]);
  });

  it('should ask for confirmation before deleting and remove the user once confirmed', () => {
    http.expectOne('http://localhost:3000/users').flush(users);

    component.selectUser({ user: users[0], action: ViewActions.Delete });
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
    expect(dialog.open).toBeFalse();
  });

  it('should keep the user when the delete prompt is cancelled', () => {
    http.expectOne('http://localhost:3000/users').flush(users);

    component.selectUser({ user: users[0], action: ViewActions.Delete });
    fixture.detectChanges();
    component.cancelDelete();
    fixture.detectChanges();

    http.expectNone('http://localhost:3000/users/1');
    expect(component.users()).toEqual(users);
    expect(fixture.nativeElement.querySelector('dialog').open).toBeFalse();
    expect(fixture.nativeElement.querySelector('tr[mat-row]').classList).not.toContain('bg-red-50');
  });
});
