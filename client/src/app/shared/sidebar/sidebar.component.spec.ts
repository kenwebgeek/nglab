import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { User } from '../../users/models/user.interface';
import { UsersStore } from '../../users/state/users.store';

import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  const users = signal<ReadonlyArray<User>>([]);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [{ provide: UsersStore, useValue: { users } }],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the workspace navigation', () => {
    expect(fixture.nativeElement.querySelector('nav[aria-label="Workspace"]')).toBeTruthy();
  });

  it('should show the number of users from the store', () => {
    const count = () => fixture.nativeElement.querySelector('nav[aria-label="Workspace"]').textContent;
    expect(count()).toContain('0');

    users.set([{ id: 1 }, { id: 2 }, { id: 3 }] as User[]);
    fixture.detectChanges();
    expect(count()).toContain('3');
  });
});
