import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, Subscription } from 'rxjs';

import { CustomerService, AccountService, TransactionService, LoadingService, AuthService, DataRefreshService } from '@shared/services';
import { User } from '@shared/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    RouterModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  totalCustomers = 0;
  totalAccounts = 0;
  totalTransactions = 0;
  totalBalance = 0;
  isLoading = true;
  currentUser: User | null = null;
  isAdmin = false;
  private refreshSubscription?: Subscription;

  constructor(
    private readonly customerService: CustomerService,
    private readonly accountService: AccountService,
    private readonly transactionService: TransactionService,
    private readonly loadingService: LoadingService,
    private readonly authService: AuthService,
    private readonly dataRefreshService: DataRefreshService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.isAdmin = this.authService.hasRole('ADMIN');
    this.loadDashboardData();
    
    // Subscribe to refresh events
    this.refreshSubscription = this.dataRefreshService.refreshTrigger$.subscribe((component) => {
      if (component === 'all' || component === 'dashboard') {
        this.loadDashboardData();
      }
    });
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
  }

  refresh(): void {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    this.loadingService.show();

    if (this.isAdmin) {
      // Admin sees all system data
      this.loadAdminDashboard();
    } else {
      // Users see only their own data
      this.loadUserDashboard();
    }
  }

  private loadAdminDashboard(): void {
    // Load all data in parallel using forkJoin
    forkJoin({
      customers: this.customerService.getAllCustomers(),
      accounts: this.accountService.getAllAccounts(),
      transactions: this.transactionService.getAllTransactions()
    }).subscribe({
      next: ({ customers, accounts, transactions }) => {
        this.totalCustomers = customers.length;
        this.totalAccounts = accounts.length;
        this.totalTransactions = transactions.length;
        
        // Calculate total balance from all accounts
        this.totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
        
        this.isLoading = false;
        this.loadingService.hide();
      },
      error: (error) => {
        console.error('Error loading admin dashboard data:', error);
        this.resetDashboardData();
      }
    });
  }

  private loadUserDashboard(): void {
    if (!this.currentUser?.id) {
      this.resetDashboardData();
      return;
    }

    // Load only user's own data
    forkJoin({
      accounts: this.accountService.getAccountsByCustomerId(this.currentUser.id),
      transactions: this.transactionService.getTransactionsByCustomerId(this.currentUser.id)
    }).subscribe({
      next: ({ accounts, transactions }) => {
        this.totalCustomers = 1; // Current user only
        this.totalAccounts = accounts.length;
        this.totalTransactions = transactions.length;
        
        // Calculate balance from user's accounts only
        this.totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
        
        this.isLoading = false;
        this.loadingService.hide();
      },
      error: (error) => {
        console.error('Error loading user dashboard data:', error);
        this.resetDashboardData();
      }
    });
  }

  private resetDashboardData(): void {
    this.totalCustomers = 0;
    this.totalAccounts = 0;
    this.totalTransactions = 0;
    this.totalBalance = 0;
    this.isLoading = false;
    this.loadingService.hide();
  }
}