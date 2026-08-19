import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-bg">
      <mat-card class="login-card">
        <mat-card-header>
          <div class="logo">
            <mat-icon class="logo-icon">inventory_2</mat-icon>
            <span>Order Management</span>
          </div>
          <mat-card-title>Sign in</mat-card-title>
          <mat-card-subtitle>Enter your credentials to continue</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          @if (auth.error()) {
            <div class="error-banner">
              <mat-icon>error_outline</mat-icon> {{ auth.error() }}
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="login()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="username" />
              <mat-icon matPrefix>email</mat-icon>
              <mat-error>Valid email required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input
                matInput
                [type]="showPass ? 'text' : 'password'"
                formControlName="password"
                autocomplete="current-password"
              />
              <mat-icon matPrefix>lock</mat-icon>
              <button type="button" mat-icon-button matSuffix (click)="showPass = !showPass">
                <mat-icon>{{ showPass ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error>Password required</mat-error>
            </mat-form-field>

            <button
              type="submit"
              mat-raised-button
              color="primary"
              class="full-width submit-btn"
              [disabled]="form.invalid || auth.loading()"
            >
              @if (auth.loading()) {
                <mat-spinner diameter="20" />
              } @else {
                Sign In
              }
            </button>
          </form>

          <div class="demo-hint">
            <p>Demo credentials:</p>
            <code>admin@oms.dev / password</code>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-bg {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%);
    }
    .login-card { width: 100%; max-width: 420px; padding: 24px; }
    .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .logo-icon { color: #1976d2; font-size: 32px; width: 32px; height: 32px; }
    .logo span { font-size: 18px; font-weight: 600; }
    .full-width { width: 100%; }
    .submit-btn { height: 48px; margin-top: 8px; }
    .error-banner {
      display: flex; align-items: center; gap: 8px;
      background: #ffebee; color: #c62828;
      padding: 10px 14px; border-radius: 6px;
      margin-bottom: 16px; font-size: 14px;
    }
    .demo-hint { margin-top: 20px; padding: 12px; background: #f5f5f5; border-radius: 6px; font-size: 13px; }
    .demo-hint p { margin: 0 0 4px; color: #757575; }
    .demo-hint code { color: #1976d2; }
  `]
})
export class LoginComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  showPass = false;

  readonly form = this.fb.group({
    email: ['admin@oms.dev', [Validators.required, Validators.email]],
    password: ['password', Validators.required],
  });

  login(): void {
    if (this.form.valid) {
      const { email, password } = this.form.getRawValue();
      this.auth.login({ email: email!, password: password! }).subscribe({
        next: () => this.router.navigate(['/dashboard']),
      });
    }
  }
}
