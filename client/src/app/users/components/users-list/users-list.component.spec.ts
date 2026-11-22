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
    fixture.componentRef.setInput('isAdmin', true);
    fixture.componentRef.setInput('headers', [{ headerName: 'Email', fieldName: 'email' }]);
    fixture.componentRef.setInput('users', [
      { id: 1, firstName: 'Tony', lastName: 'Stark', nickname: 'Iron Man', email: 'tony@avengers.com' },
    ]);
    fixture.detectChanges();

    expect(component.headerFields()).toEqual(['name', 'email', 'actions']);
    expect(fixture.nativeElement.querySelector('td.mat-column-name').textContent).toContain('TS');
    expect(fixture.nativeElement.querySelector('td.mat-column-name').textContent).toContain('Tony Stark');
  });

  it('should show a delete button for every user', () => {
    fixture.componentRef.setInput('isAdmin', true);
    const tony = { id: 1, firstName: 'Tony', lastName: 'Stark', nickname: 'Iron Man', email: 'tony@avengers.com' };
    const natasha = { id: 2, firstName: 'Natasha', lastName: 'Romanoff', nickname: 'Black Widow', email: 'nat@avengers.com' };
    fixture.componentRef.setInput('users', [tony, natasha]);
    fixture.detectChanges();

    const emitted: unknown[] = [];
    component.userDeleted.subscribe(value => emitted.push(value));

    const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row]'));
    expect(rows[0].querySelector('a')?.getAttribute('aria-label')).toBe('Edit Tony Stark');
    expect(rows[1].querySelector('a')?.getAttribute('aria-label')).toBe('Edit Natasha Romanoff');
    const tonyButtons: HTMLButtonElement[] = Array.from(rows[0].querySelectorAll('button'));
    const natashaButtons: HTMLButtonElement[] = Array.from(rows[1].querySelectorAll('button'));
    expect(tonyButtons.map(button => button.getAttribute('aria-label'))).toEqual(['Delete Tony Stark']);
    expect(natashaButtons.map(button => button.getAttribute('aria-label'))).toEqual(['Delete Natasha Romanoff']);

    natashaButtons[0].click();
    expect(emitted).toEqual([natasha]);
  });

  it('hides user management actions for non-admins', () => {
    fixture.componentRef.setInput('users', [
      { id: 1, firstName: 'Tony', lastName: 'Stark', nickname: '', email: 'tony@avengers.com' },
    ]);
    fixture.detectChanges();
    expect(component.headerFields()).not.toContain('actions');
    expect(fixture.nativeElement.querySelector('a[href="/users/manage"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('td.mat-column-actions')).toBeNull();
  });

  it('should highlight only the row of the highlighted user', () => {
    fixture.componentRef.setInput('users', [
      { id: 1, firstName: 'Tony', lastName: 'Stark', nickname: 'Iron Man', email: 'tony@avengers.com' },
      { id: 2, firstName: 'Natasha', lastName: 'Romanoff', nickname: 'Black Widow', email: 'nat@avengers.com' },
    ]);
    fixture.componentRef.setInput('highlightedUserId', 2);
    fixture.detectChanges();

    const [first, second]: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row]'));
    expect(first.classList).not.toContain('bg-red-50');
    expect(second.classList).toContain('bg-red-50');
    expect(second.classList).not.toContain('hover:bg-slate-50');

    fixture.componentRef.setInput('highlightedUserId', null);
    fixture.detectChanges();
    expect(second.classList).not.toContain('bg-red-50');
    expect(second.classList).toContain('hover:bg-slate-50');
  });
});
