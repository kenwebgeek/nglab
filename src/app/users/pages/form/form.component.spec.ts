import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { User } from '../../models/user.interface';
import { UsersStore } from '../../state/users.store';
import { FormComponent } from './form.component';

const tony: User = { id: 1, firstName: 'Tony', lastName: 'Stark', nickname: 'Iron Man', email: 'tony@avengers.com' };

describe('FormComponent', () => {
  let component: FormComponent;
  let fixture: ComponentFixture<FormComponent>;
  let store: { users: ReturnType<typeof signal<ReadonlyArray<User>>>, add: jasmine.Spy, update: jasmine.Spy };

  beforeEach(async () => {
    store = { users: signal([tony]), add: jasmine.createSpy('add'), update: jasmine.createSpy('update') };

    await TestBed.configureTestingModule({
      imports: [ FormComponent ],
      providers: [provideRouter([]), { provide: UsersStore, useValue: store }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should select the user matching the id route param', () => {
    fixture.componentRef.setInput('id', '1');
    expect(component.user()).toEqual(tony);
  });

  it('should have no selected user without a matching id', () => {
    expect(component.user()).toBeNull();

    fixture.componentRef.setInput('id', '99');
    expect(component.user()).toBeNull();
  });

  it('should add a user on the Create action', () => {
    component.formAction({ value: tony, action: 'Create' });
    expect(store.add).toHaveBeenCalledWith(tony);
  });

  it('should update a user on the Update action', () => {
    component.formAction({ value: tony, action: 'Update' });
    expect(store.update).toHaveBeenCalledWith(tony);
  });
});
