import { Component, OnInit, inject, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { WebSocketService } from '../core/services/websocket.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatProgressSpinnerModule],
  template: `
    @if (!auth.isInitialized()) {
      <div class="splash">
        <mat-spinner diameter="56" />
      </div>
    } @else {
      <router-outlet />
    }
  `,
  styles: [`
    .splash {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: #f5f7fa;
    }
  `]
})
export class AppComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly ws = inject(WebSocketService);

  constructor() {
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.ws.connect();
      } else {
        this.ws.disconnect();
      }
    });
  }

  ngOnInit(): void {}
}
