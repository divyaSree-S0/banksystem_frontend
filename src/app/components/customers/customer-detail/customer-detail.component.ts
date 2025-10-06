import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Customer, Account } from '@shared/models';
import { CustomerService, AccountService, NotificationService, LoadingService } from '@shared/services';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTableModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './customer-detail.component.html',
  styleUrls: ['./customer-detail.component.css']
})
export class CustomerDetailComponent implements OnInit {
  customer?: Customer;
  customerAccounts: Account[] = [];
  isLoading = false;
  isLoadingAccounts = false;
  customerId?: number;

  accountColumns: string[] = ['accountNumber', 'accountType', 'balance', 'actions'];

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly customerService: CustomerService,
    private readonly accountService: AccountService,
    private readonly notificationService: NotificationService,
    private readonly loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.customerId = +params['id'];
        this.loadCustomer();
        this.loadAccounts();
      }
    });
  }

  loadCustomer(): void {
    if (!this.customerId) return;

    this.isLoading = true;
    this.loadingService.show();

    this.customerService.getCustomerById(this.customerId).subscribe({
      next: (customer) => {
        this.customer = customer;
        this.isLoading = false;
        this.loadingService.hide();
      },
      error: (error) => {
        console.error('Error loading customer:', error);
        this.notificationService.showError('Failed to load customer details');
        this.isLoading = false;
        this.loadingService.hide();
      }
    });
  }

  loadAccounts(): void {
    if (!this.customerId) return;

    this.isLoadingAccounts = true;

    this.accountService.getAccountsByCustomerId(this.customerId).subscribe({
      next: (accounts) => {
        this.customerAccounts = accounts;
        this.isLoadingAccounts = false;
      },
      error: (error) => {
        console.error('Error loading accounts:', error);
        this.notificationService.showError('Failed to load customer accounts');
        this.isLoadingAccounts = false;
      }
    });
  }

  editCustomer(): void {
    if (this.customerId) {
      this.router.navigate(['/customers', this.customerId, 'edit']);
    }
  }

  createAccount(): void {
    this.router.navigate(['/accounts/new'], {
      queryParams: { customerId: this.customerId }
    });
  }

  goBack(): void {
    this.router.navigate(['/customers']);
  }
}