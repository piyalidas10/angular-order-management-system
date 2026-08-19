import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OrderFacade } from '../../facades/order.facade';
import { OrderPriority } from '../../../../shared/models/order.model';

@Component({
  selector: 'app-order-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-container">
      <button mat-button routerLink="/orders"><mat-icon>arrow_back</mat-icon> Orders</button>

      <mat-card class="form-card">
        <mat-card-header>
          <mat-card-title>Create New Order</mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">

            <!-- Customer Section -->
            <h3 class="section-title">Customer Information</h3>
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Customer ID</mat-label>
                <input matInput formControlName="customerId" />
                <mat-error>Required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Customer Name</mat-label>
                <input matInput formControlName="customerName" />
                <mat-error>Required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Customer Email</mat-label>
                <input matInput type="email" formControlName="customerEmail" />
                <mat-error>Valid email required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Priority</mat-label>
                <mat-select formControlName="priority">
                  @for (p of priorities; track p) {
                    <mat-option [value]="p">{{ p | titlecase }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

            <mat-divider />

            <!-- Shipping Address -->
            <h3 class="section-title">Shipping Address</h3>
            <div formGroupName="shippingAddress" class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Street</mat-label>
                <input matInput formControlName="street" />
                <mat-error>Required</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>City</mat-label>
                <input matInput formControlName="city" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>State</mat-label>
                <input matInput formControlName="state" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>ZIP</mat-label>
                <input matInput formControlName="zip" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Country</mat-label>
                <input matInput formControlName="country" />
              </mat-form-field>
            </div>

            <mat-divider />

            <!-- Items -->
            <div class="items-header">
              <h3 class="section-title">Order Items</h3>
              <button type="button" mat-stroked-button (click)="addItem()">
                <mat-icon>add</mat-icon> Add Item
              </button>
            </div>

            <div formArrayName="items">
              @for (item of items.controls; track $index) {
                <div [formGroupName]="$index" class="item-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Product ID</mat-label>
                    <input matInput formControlName="productId" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Product Name</mat-label>
                    <input matInput formControlName="productName" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>SKU</mat-label>
                    <input matInput formControlName="sku" />
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="small">
                    <mat-label>Qty</mat-label>
                    <input matInput type="number" formControlName="quantity" min="1" />
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="small">
                    <mat-label>Unit Price</mat-label>
                    <input matInput type="number" formControlName="unitPrice" min="0" />
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="small">
                    <mat-label>Discount %</mat-label>
                    <input matInput type="number" formControlName="discount" min="0" max="100" />
                  </mat-form-field>
                  <button type="button" mat-icon-button color="warn" (click)="removeItem($index)">
                    <mat-icon>remove_circle</mat-icon>
                  </button>
                </div>
              }
            </div>

            <mat-divider />

            <!-- Notes -->
            <mat-form-field appearance="outline" class="full-width" style="margin-top:16px">
              <mat-label>Notes</mat-label>
              <textarea matInput formControlName="notes" rows="3"></textarea>
            </mat-form-field>

            <!-- Actions -->
            <div class="form-actions">
              <button type="button" mat-stroked-button routerLink="/orders">Cancel</button>
              <button
                type="submit"
                mat-raised-button
                color="primary"
                [disabled]="form.invalid || facade.creating()"
              >
                @if (facade.creating()) { <mat-spinner diameter="20" /> }
                @else { Create Order }
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 900px; margin: 0 auto; }
    .form-card { margin-top: 16px; }
    .section-title { font-size: 16px; font-weight: 600; margin: 16px 0 12px; color: #424242; }
    .form-row { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 16px; }
    .form-row mat-form-field { flex: 1 1 200px; }
    .full-width { width: 100%; }
    .items-header { display: flex; justify-content: space-between; align-items: center; }
    .item-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; padding: 12px; background: #fafafa; border-radius: 8px; margin-bottom: 12px; }
    .item-row mat-form-field { flex: 1 1 140px; }
    .item-row mat-form-field.small { flex: 0 1 90px; }
    .form-actions { display: flex; justify-content: flex-end; gap: 12px; padding-top: 16px; }
  `]
})
export class OrderFormPageComponent {
  readonly facade = inject(OrderFacade);
  private readonly fb = inject(FormBuilder);

  readonly priorities: OrderPriority[] = ['low', 'normal', 'high', 'urgent'];

  readonly form: FormGroup = this.fb.group({
    customerId: ['', Validators.required],
    customerName: ['', Validators.required],
    customerEmail: ['', [Validators.required, Validators.email]],
    priority: ['normal'],
    shippingAddress: this.fb.group({
      street: ['', Validators.required],
      city: ['', Validators.required],
      state: [''],
      zip: ['', Validators.required],
      country: ['', Validators.required],
    }),
    notes: [''],
    items: this.fb.array([this.buildItemGroup()]),
  });

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  addItem(): void {
    this.items.push(this.buildItemGroup());
  }

  removeItem(index: number): void {
    if (this.items.length > 1) this.items.removeAt(index);
  }

  submit(): void {
    if (this.form.valid) {
      this.facade.createOrder(this.form.getRawValue());
    } else {
      this.form.markAllAsTouched();
    }
  }

  private buildItemGroup(): FormGroup {
    return this.fb.group({
      productId: ['', Validators.required],
      productName: ['', Validators.required],
      sku: [''],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0.01)]],
      discount: [0, [Validators.min(0), Validators.max(100)]],
    });
  }
}
