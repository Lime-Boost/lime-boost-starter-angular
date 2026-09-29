import { ChangeDetectionStrategy, Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-password-input',
  templateUrl: './password-input.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './password-input.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PasswordInput),
      multi: true,
    },
  ],
})
export class PasswordInput implements ControlValueAccessor {
  readonly autocomplete = input('current-password');

  protected readonly visible = signal(false);
  protected readonly disabled = signal(false);
  protected readonly value = signal('');
  protected readonly inputType = computed(() => (this.visible() ? 'text' : 'password'));
  protected readonly toggleLabel = computed(() =>
    this.visible() ? 'Hide password' : 'Show password',
  );

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value.set(value);
    this.onChange(value);
  }

  protected markTouched(): void {
    this.onTouched();
  }

  protected toggleVisibility(event: Event): void {
    event.preventDefault();
    this.visible.update((visible) => !visible);
  }
}
