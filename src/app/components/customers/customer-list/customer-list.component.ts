import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

import { Customer } from '@shared/models';
import { CustomerService, LoadingService, NotificationService, AuthService } from '@shared/services';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './customer-list.component.html',
  styleUrl: './customer-list.component.css'
})
export class CustomerListComponent implements OnInit {
  customers: Customer[] = [];
  filteredCustomers: Customer[] = [];
  searchControl = new FormControl('');
  isLoading = false;
  isAdmin = false;
  currentUser: any = null;

  displayedColumns: string[] = ['customerName', 'email', 'phoneNo', 'address', 'actions'];

  constructor(
    private readonly customerService: CustomerService,
    private readonly loadingService: LoadingService,
    private readonly notificationService: NotificationService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.isAdmin = this.authService.hasRole('ADMIN');
    
    if (!this.isAdmin) {
      // Non-admin users shouldn't access customer list
      this.notificationService.showError('Access denied. Admin privileges required.');
      return;
    }

    this.loadCustomers();
    this.setupSearch();
  }

  setupSearch(): void {
    this.searchControl.valueChanges.subscribe(() => {
      this.applyFilter();
    });
  }

  loadCustomers(): void {
    this.isLoading = true;
    this.loadingService.show();

    this.customerService.getAllCustomers().subscribe({
      next: (customers) => {
        this.customers = customers;
        this.filteredCustomers = customers;
        this.isLoading = false;
        this.loadingService.hide();
      },
      error: (error) => {
        console.error('Error loading customers:', error);
        this.notificationService.showError('Failed to load customers');
        this.isLoading = false;
        this.loadingService.hide();
      }
    });
  }

  applyFilter(): void {
    const filterValue = this.searchControl.value?.toLowerCase().trim() || '';
    
    if (!filterValue) {
      this.filteredCustomers = this.customers;
      return;
    }

    this.filteredCustomers = this.customers.filter(customer =>
      customer.customerName.toLowerCase().includes(filterValue) ||
      customer.email.toLowerCase().includes(filterValue) ||
      customer.phoneNo.toLowerCase().includes(filterValue)
    );
  }

  clearSearch(): void {
    this.searchControl.setValue('');
  }

  hasActiveSearch(): boolean {
    return !!(this.searchControl.value?.trim());
  }

  deleteCustomer(customer: Customer): void {
    if (confirm(`Are you sure you want to delete customer "${customer.customerName}"?`)) {
      if (customer.customerId) {
        this.customerService.deleteCustomer(customer.customerId).subscribe({
          next: () => {
            this.notificationService.showSuccess('Customer deleted successfully');
            this.loadCustomers(); // Reload the list
          },
          error: (error) => {
            console.error('Error deleting customer:', error);
            this.notificationService.showError('Failed to delete customer');
          }
        });
      }
    }
  }
}