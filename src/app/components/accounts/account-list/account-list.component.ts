import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';

import { Account, AccountType } from '@shared/models';
import { AccountService, CustomerService, LoadingService, NotificationService, AuthService, DataRefreshService } from '@shared/services';

@Component({
  selector: 'app-account-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  templateUrl: './account-list.component.html',
  styleUrls: ['./account-list.component.css']
})
export class AccountListComponent implements OnInit {
  accounts: Account[] = [];
  filteredAccounts: Account[] = [];
  searchTerm = '';
  selectedAccountType = '';
  isLoading = false;
  isAdmin = false;
  currentUser: any = null;

  displayedColumns: string[] = ['accountNumber', 'customerName', 'accountType', 'balance', 'actions'];

  constructor(
    private readonly accountService: AccountService,
    private readonly customerService: CustomerService,
    private readonly loadingService: LoadingService,
    private readonly notificationService: NotificationService,
    private readonly authService: AuthService,
    private readonly dataRefreshService: DataRefreshService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.isAdmin = this.authService.hasRole('ADMIN');
    
    // Set display columns based on role
    this.displayedColumns = this.isAdmin 
      ? ['accountNumber', 'customerName', 'accountType', 'balance', 'actions']
      : ['accountNumber', 'accountType', 'balance', 'actions'];
      
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.isLoading = true;
    this.loadingService.show();

    if (this.isAdmin) {
      // Admin sees all accounts
      this.accountService.getAllAccounts().subscribe({
        next: (accounts) => {
          this.accounts = accounts;
          this.filteredAccounts = accounts;
          this.isLoading = false;
          this.loadingService.hide();
        },
        error: (error) => {
          console.error('Error loading accounts:', error);
          this.notificationService.showError('Failed to load accounts');
          this.isLoading = false;
          this.loadingService.hide();
        }
      });
    } else {
      // Users see only their own accounts
      if (this.currentUser?.id) {
        this.accountService.getAccountsByCustomerId(this.currentUser.id).subscribe({
          next: (accounts) => {
            this.accounts = accounts;
            this.filteredAccounts = accounts;
            this.isLoading = false;
            this.loadingService.hide();
          },
          error: (error) => {
            console.error('Error loading user accounts:', error);
            this.notificationService.showError('Failed to load your accounts');
            this.isLoading = false;
            this.loadingService.hide();
          }
        });
      } else {
        this.notificationService.showError('User information not available');
        this.isLoading = false;
        this.loadingService.hide();
      }
    }
  }

  applyFilters(): void {
    let filtered = this.accounts;

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(account =>
        account.accountNumber.toLowerCase().includes(searchLower) ||
        account.customerName?.toLowerCase().includes(searchLower)
      );
    }

    // Apply account type filter
    if (this.selectedAccountType) {
      filtered = filtered.filter(account => 
        account.accountType === this.selectedAccountType
      );
    }

    this.filteredAccounts = filtered;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedAccountType = '';
    this.filteredAccounts = this.accounts;
  }

  getTotalBalance(): number {
    return this.filteredAccounts.reduce((total, account) => total + account.balance, 0);
  }

  getBalanceClass(balance: number): string {
    if (balance > 0) return 'balance-positive';
    if (balance === 0) return 'balance-zero';
    return 'balance-negative';
  }

  deleteAccount(accountId: number): void {
    if (!this.isAdmin) {
      this.notificationService.showError('Only administrators can delete accounts');
      return;
    }

    if (confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      this.accountService.deleteAccount(accountId).subscribe({
        next: () => {
          this.notificationService.showSuccess('Account deleted successfully');
          this.loadAccounts(); // Reload the list
        },
        error: (error) => {
          console.error('Error deleting account:', error);
          this.notificationService.showError('Failed to delete account');
        }
      });
    }
  }

  refresh(): void {
    this.loadAccounts();
  }
}