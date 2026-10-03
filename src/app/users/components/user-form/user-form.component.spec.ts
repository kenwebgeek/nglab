import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { UserFormComponent } from './user-form.component';
import { MaterialModule } from '../../../material/material.module';

describe('UserFormComponent', () => {
  let component: UserFormComponent;
  let fixture: ComponentFixture<UserFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ NoopAnimationsModule, ReactiveFormsModule, MaterialModule ],
      declarations: [ UserFormComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
