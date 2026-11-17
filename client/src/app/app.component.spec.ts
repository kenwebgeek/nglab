import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { ThemeStore } from './shared/theme/theme.store';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'Angular Lab'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('Angular Lab');
  });

  it('should follow the theme store with the dark class on the root element', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const theme = TestBed.inject(ThemeStore);
    fixture.detectChanges();
    const root = (fixture.nativeElement as HTMLElement).firstElementChild as HTMLElement;

    expect(root.classList.contains('dark')).toBeFalse();

    theme.toggle();
    fixture.detectChanges();
    expect(root.classList.contains('dark')).toBeTrue();

    theme.toggle();
    fixture.detectChanges();
    expect(root.classList.contains('dark')).toBeFalse();
  });
});
