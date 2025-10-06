import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';

import { Account, Transaction } from '@shared/models';
import { AccountService, TransactionService, NotificationService, LoadingService } from '@shared/services';

@Component({
  selector: 'app-account-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  templateUrl: './account-detail.component.html',
  styleUrls: ['./account-detail.component.css']
})
export class AccountDetailComponent implements OnInit {
  account?: Account;
  accountTransactions: Transaction[] = [];
  isLoading = false;
  isLoadingTransactions = false;
  accountId?: number;

  transactionColumns: string[] = ['dateTime', 'type', 'description', 'amount'];

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly accountService: AccountService,
    private readonly transactionService: TransactionService,
    private readonly notificationService: NotificationService,
    private readonly loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.accountId = +params['id'];
        this.loadAccount();
        this.loadTransactions();
      }
    });
  }

  loadAccount(): void {
    if (!this.accountId) return;

    this.isLoading = true;
    this.loadingService.show();

    this.accountService.getAccountById(this.accountId).subscribe({
      next: (account) => {
        this.account = account;
        this.isLoading = false;
        this.loadingService.hide();
      },
      error: (error) => {
        console.error('Error loading account:', error);
        this.notificationService.showError('Failed to load account details');
        this.isLoading = false;
        this.loadingService.hide();
      }
    });
  }

  loadTransactions(): void {
    if (!this.accountId) return;

    this.isLoadingTransactions = true;

    this.transactionService.getTransactionsByAccountId(this.accountId).subscribe({
      next: (transactions) => {
        // Sort transactions by date (newest first)
        const sortedTransactions = [...transactions];
        sortedTransactions.sort((a, b) => 
          new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
        );
        this.accountTransactions = sortedTransactions;
        this.isLoadingTransactions = false;
      },
      error: (error) => {
        console.error('Error loading transactions:', error);
        this.notificationService.showError('Failed to load transaction history');
        this.isLoadingTransactions = false;
      }
    });
  }

  getBalanceClass(balance: number): string {
    if (balance > 0) return 'balance-positive';
    if (balance === 0) return 'balance-zero';
    return 'balance-negative';
  }

  getTransactionAmountClass(type: string): string {
    if (type === 'DEPOSIT') return 'amount-positive';
    if (type === 'WITHDRAW') return 'amount-negative';
    return 'amount-neutral';
  }

  getTransactionSign(type: string): string {
    if (type === 'DEPOSIT') return '+';
    if (type === 'WITHDRAW') return '-';
    return '';
  }

  makeTransaction(): void {
    if (this.accountId) {
      this.router.navigate(['/transactions/new'], {
        queryParams: { accountId: this.accountId }
      });
    }
  }

  makeDeposit(): void {
    if (this.accountId) {
      this.router.navigate(['/transactions/new'], {
        queryParams: { 
          accountId: this.accountId,
          type: 'deposit'
        }
      });
    }
  }

  makeWithdrawal(): void {
    if (this.accountId) {
      this.router.navigate(['/transactions/new'], {
        queryParams: { 
          accountId: this.accountId,
          type: 'withdraw'
        }
      });
    }
  }

  makeTransfer(): void {
    if (this.accountId) {
      this.router.navigate(['/transactions/new'], {
        queryParams: { 
          fromAccountId: this.accountId,
          type: 'transfer'
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/accounts']);
  }
}