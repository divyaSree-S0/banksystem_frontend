import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Account, AccountType, CreateAccountRequest, Customer } from '@shared/models';
import { AccountService, CustomerService, NotificationService, LoadingService, AuthService } from '@shared/services';

@Component({
  selector: 'app-account-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './account-form.component.html',
  styleUrls: ['./account-form.component.css']
})
export class AccountFormComponent implements OnInit {
  accountForm: FormGroup;
  customers: Customer[] = [];
  selectedCustomer?: Customer;
  isSubmitting = false;
  isLoadingCustomers = false;
  isAdmin = false;
  currentUser: any = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly accountService: AccountService,
    private readonly customerService: CustomerService,
    private readonly notificationService: NotificationService,
    private readonly loadingService: LoadingService,
    private readonly authService: AuthService
  ) {
    this.accountForm = this.createForm();
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.isAdmin = this.authService.hasRole('ADMIN');
    
    this.loadCustomers();
    
    // Check for pre-selected customer from query params
    this.route.queryParams.subscribe(params => {
      if (params['customerId']) {
        this.accountForm.patchValue({
          customerId: +params['customerId']
        });
      }
    });
  }

  private createForm(): FormGroup {
    return this.fb.group({
      customerId: ['', [Validators.required]],
      accountType: ['', [Validators.required]],
      initialBalance: [0, [Validators.required, Validators.min(0)]]
    });
  }

  private loadCustomers(): void {
    this.isLoadingCustomers = true;
    this.loadingService.show();

    if (this.isAdmin) {
      // Admin can create accounts for any customer
      this.customerService.getAllCustomers().subscribe({
        next: (customers) => {
          this.customers = customers;
          this.isLoadingCustomers = false;
          this.loadingService.hide();
          
          // If customerId was set from query params, find and set the customer
          const selectedId = this.accountForm.get('customerId')?.value;
          if (selectedId) {
            this.onCustomerChange(selectedId);
          }
        },
        error: (error) => {
          console.error('Error loading customers:', error);
          this.notificationService.showError('Failed to load customers');
          this.isLoadingCustomers = false;
          this.loadingService.hide();
        }
      });
    } else if (this.currentUser) {
      // Users can only create accounts for themselves
      const currentCustomer: Customer = {
        customerId: this.currentUser.id,
        customerName: this.currentUser.fullName,
        email: this.currentUser.email,
        phoneNo: '', // These might not be available in the auth token
        address: ''
      };
      
      this.customers = [currentCustomer];
      this.selectedCustomer = currentCustomer;
      
      // Auto-select the current user
      this.accountForm.patchValue({
        customerId: currentCustomer.customerId
      });
      
      this.isLoadingCustomers = false;
      this.loadingService.hide();
    } else {
      this.notificationService.showError('User information not available');
      this.isLoadingCustomers = false;
      this.loadingService.hide();
    }
  }

  onCustomerChange(customerId: number): void {
    this.selectedCustomer = this.customers.find(c => c.customerId === customerId);
  }

  onSubmit(): void {
    if (this.accountForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;
    const formData = this.accountForm.value as CreateAccountRequest;

    this.accountService.createAccount(formData).subscribe({
      next: (account) => {
        this.notificationService.showSuccess('Account created successfully');
        this.router.navigate(['/accounts', account.accountId]);
      },
      error: (error) => {
        console.error('Error creating account:', error);
        this.notificationService.showError('Failed to create account');
        this.isSubmitting = false;
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.accountForm.controls).forEach(key => {
      const control = this.accountForm.get(key);
      control?.markAsTouched();
    });
  }

  goBack(): void {
    // If we came from a customer detail page, go back there
    const customerId = this.route.snapshot.queryParams['customerId'];
    if (customerId) {
      this.router.navigate(['/customers', customerId]);
    } else {
      this.router.navigate(['/accounts']);
    }
  }
}