import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { PasswordInput } from './password-input';

@Component({
  imports: [PasswordInput, ReactiveFormsModule],
  template: `<app-password-input [formControl]="password" autocomplete="current-password" />`,
})
class Host {
  readonly password = new FormControl('secret', { nonNullable: true });
}

describe('PasswordInput', () => {
  it('toggles password visibility without losing the value', async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
    }).compileComponents();

    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const input = host.querySelector('input') as HTMLInputElement;
    const toggle = host.querySelector('button.toggle') as HTMLButtonElement;

    expect(input.type).toBe('password');
    expect(input.value).toBe('secret');
    expect(toggle.getAttribute('aria-label')).toBe('Show password');

    toggle.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(input.type).toBe('text');
    expect(input.value).toBe('secret');
    expect(toggle.getAttribute('aria-label')).toBe('Hide password');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });
});
