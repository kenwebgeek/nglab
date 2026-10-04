import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { User } from '../models/user.interface';
import { UsersStore } from './users.store';

const api = 'http://localhost:3000/users';

const tony: User = { id: 1, firstName: 'Tony', lastName: 'Stark', nickname: 'Iron Man', email: 'tony@avengers.com' };
const nat: User = { id: 2, firstName: 'Natasha', lastName: 'Romanoff', nickname: 'Black Widow', email: 'nat@avengers.com' };

describe('UsersStore', () => {
  let store: UsersStore;
  let http: HttpTestingController;
  let navigate: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    store = TestBed.inject(UsersStore);
    http = TestBed.inject(HttpTestingController);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => http.verify());

  function seed(users: User[]) {
    store.load();
    http.expectOne(api).flush(users);
  }

  it('starts with no users', () => {
    expect(store.users()).toEqual([]);
  });

  it('load() sets the users from the API', () => {
    seed([tony, nat]);
    expect(store.users()).toEqual([tony, nat]);
  });

  it('add() appends the created user and navigates to the list', () => {
    seed([tony]);
    store.add({ ...nat, id: '' as unknown as number });

    const req = http.expectOne(api);
    expect(req.request.method).toBe('POST');
    req.flush(nat);

    expect(store.users()).toEqual([tony, nat]);
    expect(navigate).toHaveBeenCalledWith(['users']);
  });

  it('update() replaces the user and navigates to the list', () => {
    seed([tony, nat]);
    const updated = { ...tony, nickname: 'Genius' };
    store.update(updated);

    const req = http.expectOne(`${api}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(updated);

    expect(store.users()).toEqual([updated, nat]);
    expect(navigate).toHaveBeenCalledWith(['users']);
  });

  it('remove() deletes the user by id', () => {
    seed([tony, nat]);
    store.remove(1);

    const req = http.expectOne(`${api}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});

    expect(store.users()).toEqual([nat]);
  });

  it('leaves the state untouched when a request fails', () => {
    seed([tony]);
    store.remove(1);
    http.expectOne(`${api}/1`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(store.users()).toEqual([tony]);
  });
});
