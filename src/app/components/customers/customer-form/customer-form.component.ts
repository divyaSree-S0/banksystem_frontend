import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Customer } from '../../../shared/models';
import { CustomerService, LoadingService, NotificationService } from '../../../shared/services';

@Component({
  selector: 'app-customer-form',
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
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './customer-form.component.html',
  styleUrl: './customer-form.component.css'
})
export class CustomerFormComponent implements OnInit {
  customerForm: FormGroup;
  isEditMode = false;
  isSubmitting = false;
  isLoading = false;
  customerId?: number;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly customerService: CustomerService,
    private readonly loadingService: LoadingService,
    private readonly notificationService: NotificationService
  ) {
    this.customerForm = this.createForm();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.customerId = +id;
      this.isEditMode = true;
      this.loadCustomer();
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      customerName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNo: ['', [Validators.required, Validators.pattern(/^[+]?[1-9]\d{0,15}$/)]],
      address: ['', [Validators.required, Validators.minLength(10)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  private loadCustomer(): void {
    if (!this.customerId) return;

    this.isLoading = true;
    this.loadingService.show();

    this.customerService.getCustomerById(this.customerId).subscribe({
      next: (customer) => {
        this.customerForm.patchValue({
          customerName: customer.customerName,
          email: customer.email,
          phoneNo: customer.phoneNo,
          address: customer.address,
          password: customer.password || ''
        });
        this.isLoading = false;
        this.loadingService.hide();
      },
      error: (error) => {
        console.error('Error loading customer:', error);
        this.notificationService.showError('Failed to load customer details');
        this.isLoading = false;
        this.loadingService.hide();
        this.goBack();
      }
    });
  }

  onSubmit(): void {
    if (this.customerForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.customerForm.value;

    const customerData = {
      customerName: formValue.customerName,
      email: formValue.email,
      phoneNo: formValue.phoneNo,
      address: formValue.address,
      password: formValue.password,
      username: formValue.username || formValue.email
    };

    const operation = this.isEditMode
      ? this.customerService.updateCustomer(this.customerId!, customerData)
      : this.customerService.createCustomer(customerData);

    operation.subscribe({
      next: (customer) => {
        const message = this.isEditMode 
          ? 'Customer updated successfully' 
          : 'Customer created successfully';
        this.notificationService.showSuccess(message);
        this.isSubmitting = false;
        this.router.navigate(['/customers']);
      },
      error: (error) => {
        console.error('Error saving customer:', error);
        const message = this.isEditMode 
          ? 'Failed to update customer' 
          : 'Failed to create customer';
        this.notificationService.showError(message);
        this.isSubmitting = false;
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.customerForm.controls).forEach(key => {
      const control = this.customerForm.get(key);
      control?.markAsTouched();
    });
  }

  goBack(): void {
    this.router.navigate(['/customers']);
  }
}