/* tslint:disable:no-unused-variable */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { provideRouter } from '@angular/router';

import { UsersListComponent } from './users-list.component';

describe('UsersListComponent', () => {
  let component: UsersListComponent;
  let fixture: ComponentFixture<UsersListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ UsersListComponent ],
      providers: [provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsersListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the name column with initials before the data columns', () => {
    fixture.componentRef.setInput('headers', [{ headerName: 'Email', fieldName: 'email' }]);
    fixture.componentRef.setInput('users', [
      { id: 1, firstName: 'Tony', lastName: 'Stark', nickname: 'Iron Man', email: 'tony@avengers.com' },
    ]);
    fixture.detectChanges();

    expect(component.headerFields()).toEqual(['name', 'email', 'actions']);
    expect(fixture.nativeElement.querySelector('td.mat-column-name').textContent).toContain('TS');
    expect(fixture.nativeElement.querySelector('td.mat-column-name').textContent).toContain('Tony Stark');
  });
});
