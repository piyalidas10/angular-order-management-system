import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterModule, MatButtonModule, MatIconModule],
  template: `
    <div class="error-page">
      <h1>404</h1>
      <h2>Page Not Found</h2>
      <p>The page you are looking for doesn't exist.</p>
      <button mat-raised-button color="primary" routerLink="/dashboard">Go Home</button>
    </div>
  `,
  styles: [`
    .error-page { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; gap: 16px; }
    h1 { font-size: 96px; font-weight: 900; color: #e0e0e0; margin: 0; }
    h2 { font-size: 24px; margin: 0; }
    p { color: #757575; }
  `]
})
export class NotFoundComponent {}

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [RouterModule, MatButtonModule, MatIconModule],
  template: `
    <div class="error-page">
      <mat-icon class="big-icon">lock</mat-icon>
      <h2>Access Denied</h2>
      <p>You don't have permission to view this page.</p>
      <button mat-raised-button color="primary" routerLink="/dashboard">Go Home</button>
    </div>
  `,
  styles: [`
    .error-page { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; gap: 16px; }
    .big-icon { font-size: 72px; width: 72px; height: 72px; color: #e0e0e0; }
    h2 { font-size: 24px; margin: 0; }
    p { color: #757575; }
  `]
})
export class UnauthorizedComponent {}
