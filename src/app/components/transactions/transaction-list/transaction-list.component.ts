import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';

import { Transaction, Account } from '../../../shared/models';
import { TransactionService, AccountService, LoadingService, NotificationService, AuthService, DataRefreshService } from '../../../shared/services';

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatPaginatorModule,
    MatTooltipModule,
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './transaction-list.component.html',
  styleUrl: './transaction-list.component.css'
})
export class TransactionListComponent implements OnInit, OnDestroy {
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  availableAccounts: Account[] = [];
  loading = false;
  isAdmin = false;
  currentUser: any = null;
  private refreshSubscription?: Subscription;

  searchControl = new FormControl('');
  typeControl = new FormControl('');
  accountControl = new FormControl('');

  displayedColumns: string[] = ['dateTime', 'type', 'account', 'description', 'amount', 'actions'];

  constructor(
    private readonly router: Router,
    private readonly transactionService: TransactionService,
    private readonly accountService: AccountService,
    private readonly loadingService: LoadingService,
    private readonly notificationService: NotificationService,
    private readonly authService: AuthService,
    private readonly dataRefreshService: DataRefreshService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.isAdmin = this.authService.hasRole('ADMIN');
    this.loadTransactions();
    this.loadAccounts();
    this.setupFilters();
    
    // Subscribe to refresh events
    this.refreshSubscription = this.dataRefreshService.refreshTrigger$.subscribe((component) => {
      if (component === 'all' || component === 'transactions') {
        this.loadTransactions();
        this.loadAccounts();
      }
    });
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
  }

  setupFilters(): void {
    // Subscribe to filter changes
    this.searchControl.valueChanges.subscribe(() => this.applyFilters());
    this.typeControl.valueChanges.subscribe(() => this.applyFilters());
    this.accountControl.valueChanges.subscribe(() => this.applyFilters());
  }

  loadTransactions(): void {
    this.loading = true;
    this.loadingService.show();

    if (this.isAdmin) {
      // Admin sees all transactions
      this.transactionService.getAllTransactions().subscribe({
        next: (transactions) => {
          // Sort transactions by date (newest first)
          const sortedTransactions = [...transactions];
          sortedTransactions.sort((a, b) => 
            new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
          );
          this.transactions = sortedTransactions;
          this.applyFilters();
          this.loading = false;
          this.loadingService.hide();
        },
        error: (error) => {
          console.error('Error loading transactions:', error);
          this.notificationService.showError('Failed to load transactions');
          this.loading = false;
          this.loadingService.hide();
        }
      });
    } else if (this.currentUser?.id) {
      // Users see only their own transactions
      this.transactionService.getTransactionsByCustomerId(this.currentUser.id).subscribe({
        next: (transactions) => {
          // Sort transactions by date (newest first)
          const sortedTransactions = [...transactions];
          sortedTransactions.sort((a, b) => 
            new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
          );
          this.transactions = sortedTransactions;
          this.applyFilters();
          this.loading = false;
          this.loadingService.hide();
        },
        error: (error) => {
          console.error('Error loading user transactions:', error);
          this.notificationService.showError('Failed to load your transactions');
          this.loading = false;
          this.loadingService.hide();
        }
      });
    } else {
      this.notificationService.showError('User information not available');
      this.loading = false;
      this.loadingService.hide();
    }
  }

  loadAccounts(): void {
    if (this.isAdmin) {
      // Admin sees all accounts for filtering
      this.accountService.getAllAccounts().subscribe({
        next: (accounts) => {
          this.availableAccounts = accounts;
        },
        error: (error) => {
          console.error('Error loading accounts:', error);
        }
      });
    } else if (this.currentUser?.id) {
      // Users see only their own accounts for filtering
      this.accountService.getAccountsByCustomerId(this.currentUser.id).subscribe({
        next: (accounts) => {
          this.availableAccounts = accounts;
        },
        error: (error) => {
          console.error('Error loading user accounts:', error);
        }
      });
    }
  }

  applyFilters(): void {
    let filtered = [...this.transactions];

    // Search filter
    const searchTerm = this.searchControl.value?.toLowerCase() || '';
    if (searchTerm) {
      filtered = filtered.filter(transaction =>
        transaction.description?.toLowerCase().includes(searchTerm) ||
        transaction.amount.toString().includes(searchTerm)
      );
    }

    // Type filter
    const typeFilter = this.typeControl.value;
    if (typeFilter) {
      filtered = filtered.filter(transaction => transaction.type === typeFilter);
    }

    // Account filter
    const accountFilter = this.accountControl.value;
    if (accountFilter) {
      filtered = filtered.filter(transaction => transaction.accountNumber === accountFilter);
    }

    this.filteredTransactions = filtered;
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.typeControl.setValue('');
    this.accountControl.setValue('');
  }

  hasActiveFilters(): boolean {
    return !!(this.searchControl.value || this.typeControl.value || this.accountControl.value);
  }

  refreshTransactions(): void {
    this.loadTransactions();
  }

  getCustomerName(accountNumber: string): string {
    const account = this.availableAccounts.find(acc => acc.accountNumber === accountNumber);
    return account?.customerName || 'Unknown';
  }

  getAmountColorClass(transaction: Transaction): string {
    if (transaction.type === 'DEPOSIT') {
      return 'amount-positive';
    } else if (transaction.type === 'WITHDRAW') {
      return 'amount-negative';
    }
    return 'amount-neutral';
  }

  getTransactionAmountClass(type: string): string {
    if (type === 'DEPOSIT') {
      return 'amount-positive';
    } else if (type === 'WITHDRAW') {
      return 'amount-negative';
    }
    return 'amount-neutral';
  }

  getTransactionSign(type: string): string {
    if (type === 'DEPOSIT') {
      return '+';
    } else if (type === 'WITHDRAW') {
      return '-';
    }
    return '';
  }

  getAccountIdFromNumber(accountNumber: string): number {
    const account = this.availableAccounts.find(acc => acc.accountNumber === accountNumber);
    return account?.accountId || 0;
  }

  refresh(): void {
    this.loadTransactions();
    this.loadAccounts();
  }
}
