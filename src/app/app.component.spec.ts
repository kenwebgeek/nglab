import { TestBed } from '@angular/core/testing';
import { provideRouter, RouterOutlet } from '@angular/router';
import { AppComponent } from './app.component';
import { HeaderComponent } from './shared/header/header.component';
import { MaterialModule } from './material/material.module';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MaterialModule,
        RouterOutlet
      ],
      declarations: [
        AppComponent,
        HeaderComponent
      ],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'ng-lab'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('Angular Lab');
  });

  it('should render the header', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-header')).toBeTruthy();
  });
});
