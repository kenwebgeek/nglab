import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SessionStore } from '../auth/state/session.store';
import { ThemeStore } from '../shared/theme/theme.store';
import { ShellLayoutComponent } from './shell-layout.component';

describe('ShellLayoutComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShellLayoutComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should render the sidebar and breadcrumb bar', () => {
    const fixture = TestBed.createComponent(ShellLayoutComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-sidebar')).toBeTruthy();
    expect(compiled.querySelector('app-breadcrumb-bar')).toBeTruthy();
  });

  it('should toggle the theme when the breadcrumb bar toggle is clicked', () => {
    const fixture = TestBed.createComponent(ShellLayoutComponent);
    const theme = TestBed.inject(ThemeStore);
    fixture.detectChanges();
    const toggle = (fixture.nativeElement as HTMLElement).querySelector('button[aria-label="Toggle dark mode"]') as HTMLButtonElement;

    toggle.click();
    expect(theme.isDarkMode()).toBeTrue();

    toggle.click();
    expect(theme.isDarkMode()).toBeFalse();
  });

  it('should log out through the session store when Log out is clicked', () => {
    const logout = spyOn(TestBed.inject(SessionStore), 'logout');
    const fixture = TestBed.createComponent(ShellLayoutComponent);
    fixture.detectChanges();
    const logOut = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find(button => button.textContent?.trim() === 'Log out')!;

    logOut.click();

    expect(logout).toHaveBeenCalled();
  });
});
