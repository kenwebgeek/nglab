import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BreadcrumbBarComponent } from './breadcrumb-bar.component';

describe('BreadcrumbBarComponent', () => {
  let fixture: ComponentFixture<BreadcrumbBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BreadcrumbBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BreadcrumbBarComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should emit when the dark mode button is clicked', () => {
    let emitted = 0;
    fixture.componentInstance.darkModeToggled.subscribe(() => emitted++);

    fixture.nativeElement.querySelector('button[aria-label="Toggle dark mode"]').click();

    expect(emitted).toBe(1);
  });

  it('should reflect the dark mode state on the button', () => {
    const button = fixture.nativeElement.querySelector('button[aria-label="Toggle dark mode"]');
    expect(button.getAttribute('aria-pressed')).toBe('false');

    fixture.componentRef.setInput('isDarkMode', true);
    fixture.detectChanges();

    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('should render the breadcrumb trail', () => {
    const trail = fixture.nativeElement.querySelector('nav[aria-label="Breadcrumb"]');
    expect(trail.textContent).toContain('Workspace');
    expect(trail.textContent).toContain('Users');
  });
});
