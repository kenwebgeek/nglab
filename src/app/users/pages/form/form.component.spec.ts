import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { FormComponent } from './form.component';
import { UserFormComponent } from '../../components/user-form/user-form.component';
import { MaterialModule } from '../../../material/material.module';

describe('FormComponent', () => {
  let component: FormComponent;
  let fixture: ComponentFixture<FormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ NoopAnimationsModule, ReactiveFormsModule, MaterialModule ],
      declarations: [ FormComponent, UserFormComponent ],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { userState: { users: [] } } })
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
