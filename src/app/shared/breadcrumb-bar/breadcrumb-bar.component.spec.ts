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

  it('should render the breadcrumb trail', () => {
    const trail = fixture.nativeElement.querySelector('nav[aria-label="Breadcrumb"]');
    expect(trail.textContent).toContain('Workspace');
    expect(trail.textContent).toContain('Users');
  });
});
