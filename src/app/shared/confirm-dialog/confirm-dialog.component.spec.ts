import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let dialog: HTMLDialogElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ConfirmDialogComponent] }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.componentRef.setInput('heading', 'Delete user');
    fixture.componentRef.setInput('message', 'Are you sure?');
    fixture.componentRef.setInput('confirmLabel', 'Delete');
    fixture.detectChanges();
    dialog = fixture.nativeElement.querySelector('dialog');
  });

  it('should be closed until opened', () => {
    expect(dialog.open).toBeFalse();

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    expect(dialog.open).toBeTrue();
    expect(dialog.textContent).toContain('Delete user');

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    expect(dialog.open).toBeFalse();
  });

  it('should emit confirmed and cancelled from its buttons', () => {
    const events: string[] = [];
    fixture.componentInstance.confirmed.subscribe(() => events.push('confirmed'));
    fixture.componentInstance.cancelled.subscribe(() => events.push('cancelled'));

    const [cancel, confirm]: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    expect(confirm.textContent).toContain('Delete');
    confirm.click();
    cancel.click();

    expect(events).toEqual(['confirmed', 'cancelled']);
  });

  it('should emit cancelled on Escape without closing itself', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const cancelled = jasmine.createSpy('cancelled');
    fixture.componentInstance.cancelled.subscribe(cancelled);

    const event = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(event);

    expect(cancelled).toHaveBeenCalled();
    expect(event.defaultPrevented).toBeTrue();
    expect(dialog.open).toBeTrue();
  });
});
