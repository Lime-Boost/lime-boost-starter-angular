import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { ProspectPage } from './prospect';
import { ProspectMatch } from './prospect.models';
import { ProspectService } from './prospect.service';

describe('ProspectPage', () => {
  const match: ProspectMatch = {
    id: 'cafe-1',
    company: 'Harbour Cafe',
    industry: 'Hospitality',
    location: 'Helsinki',
    website: 'https://harbour.example',
    email: '',
    reason: 'Buys bread from local bakeries.',
  };

  const prospectService = {
    search: () => of({ summary: 'One cafe fits.', matches: [match] }),
  };

  beforeEach(async () => {
    prospectService.search = () => of({ summary: 'One cafe fits.', matches: [match] });

    await TestBed.configureTestingModule({
      imports: [ProspectPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        {
          provide: AuthService,
          useValue: {
            user: signal({ email: 'user@example.com', sub: 'sub-1' }),
          },
        },
        { provide: ProspectService, useValue: prospectService },
      ],
    }).compileComponents();
  });

  it('asks the user to search before showing matches', async () => {
    const fixture = TestBed.createComponent(ProspectPage);
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Describe your business and who you want to find, then search.');
    expect(text).not.toContain('Harbour Cafe');
  });

  it('searches for prospects and shows matches', async () => {
    const fixture = TestBed.createComponent(ProspectPage);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    setTextarea(host, 'business', 'Wholesale bakery');
    setTextarea(host, 'lookingFor', 'Independent cafes in Helsinki');
    fixture.detectChanges();

    host.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    const text = host.textContent ?? '';
    expect(text).toContain('Harbour Cafe');
    expect(text).toContain('Helsinki');
    expect(text).toContain('Buys bread from local bakeries.');
    expect(text).toContain('One cafe fits.');
  });

  it('shows an error when the search API rejects the request', async () => {
    prospectService.search = () => throwError(() => new Error('Search failed'));

    const fixture = TestBed.createComponent(ProspectPage);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    setTextarea(host, 'business', 'Wholesale bakery');
    setTextarea(host, 'lookingFor', 'Independent cafes');
    fixture.detectChanges();

    host.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.textContent).toContain('Search failed');
  });
});

function setTextarea(host: HTMLElement, controlName: string, value: string): void {
  const field = host.querySelector(`textarea[formControlName="${controlName}"]`) as HTMLTextAreaElement;
  field.value = value;
  field.dispatchEvent(new Event('input'));
}
