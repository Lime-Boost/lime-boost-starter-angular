import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-lime-boost',
  imports: [RouterLink],
  templateUrl: './lime-boost.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './lime-boost.scss',
})
export class LimeBoost {
  protected readonly limeBoostAppUrl = 'https://app.limeboost.io';
  protected readonly environmentSnippet = `export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
  cognito: {
    region: 'eu-west-1',
    userPoolId: 'eu-west-1_XXXXXXXXX',
    clientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
  },
};`;

  protected readonly installSnippet = `</> Bash
  npm install`;

  protected readonly startSnippet = `</> Bash
  ng serve`;

  protected readonly openSnippet = `http://localhost:4200`;

  protected readonly buildSnippet = `</> Bash
  ng build`;

}
