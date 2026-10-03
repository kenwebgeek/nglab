import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { ListComponent } from './list.component';
import { UsersListComponent } from '../../components/users-list/users-list.component';
import { AlertsComponent } from '../../../shared/alerts/alerts.component';
import { MaterialModule } from '../../../material/material.module';

describe('ListComponent', () => {
  let component: ListComponent;
  let fixture: ComponentFixture<ListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ MaterialModule ],
      declarations: [ ListComponent, UsersListComponent, AlertsComponent ],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { userState: { users: [] } } })
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
