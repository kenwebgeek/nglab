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

  it('should delete a user and remove it from the list', () => {
    http.expectOne('http://localhost:3000/users').flush(users);

    component.selectUser({ user: users[0], action: ViewActions.Delete });
    http.expectOne('http://localhost:3000/users/1').flush({});

    expect(component.users()).toEqual([users[1]]);
  });
});
