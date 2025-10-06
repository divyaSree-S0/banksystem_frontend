import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';

import { Account, DepositRequest, WithdrawRequest, TransferRequest, User } from '@shared/models';
import { AccountService, TransactionService, NotificationService, LoadingService, AuthService, DataRefreshService } from '@shared/services';

@Component({
  selector: 'app-transaction-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatRadioModule
  ],
  templateUrl: './transaction-form.component.html',
  styleUrls: ['./transaction-form.component.css']
})
export class TransactionFormComponent implements OnInit {
  transactionForm: FormGroup;
  availableAccounts: Account[] = [];
  selectedType = '';
  selectedFromAccount?: Account;
  isSubmitting = false;
  currentUser: User | null = null;
  isAdmin = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly accountService: AccountService,
    private readonly transactionService: TransactionService,
    private readonly notificationService: NotificationService,
    private readonly loadingService: LoadingService,
    private readonly authService: AuthService,
    private readonly dataRefreshService: DataRefreshService
  ) {
    this.transactionForm = this.fb.group({
      type: ['', Validators.required],
      fromAccountId: [''],
      toAccountId: [''],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.isAdmin = this.authService.hasRole('ADMIN');
    this.loadAccounts();
    this.setupQueryParams();
  }

  setupQueryParams(): void {
    this.route.queryParams.subscribe(params => {
      if (params['type']) {
        this.transactionForm.patchValue({ type: params['type'].toUpperCase() });
        this.onTypeChange();
      }
      
      if (params['accountId']) {
        const accountId = +params['accountId'];
        if (params['type'] === 'deposit') {
          this.transactionForm.patchValue({ toAccountId: accountId });
        } else {
          this.transactionForm.patchValue({ fromAccountId: accountId });
        }
      }

      if (params['fromAccountId']) {
        this.transactionForm.patchValue({ fromAccountId: +params['fromAccountId'] });
      }
    });
  }

  loadAccounts(): void {
    this.loadingService.show();
    
    if (this.isAdmin) {
      // Admin can see all accounts
      this.accountService.getAllAccounts().subscribe({
        next: (accounts) => {
          this.availableAccounts = accounts;
          this.loadingService.hide();
        },
        error: (error) => {
          console.error('Error loading accounts:', error);
          this.notificationService.showError('Failed to load accounts');
          this.loadingService.hide();
        }
      });
    } else {
      // Regular users can only see their own accounts
      if (this.currentUser?.id) {
        this.accountService.getAccountsByCustomerId(this.currentUser.id).subscribe({
          next: (accounts) => {
            this.availableAccounts = accounts;
            this.loadingService.hide();
          },
          error: (error) => {
            console.error('Error loading user accounts:', error);
            this.notificationService.showError('Failed to load your accounts');
            this.loadingService.hide();
          }
        });
      } else {
        this.availableAccounts = [];
        this.loadingService.hide();
        this.notificationService.showError('User information not available');
      }
    }
  }

  onTypeChange(): void {
    this.selectedType = this.transactionForm.get('type')?.value || '';
    
    // Clear and set validators based on type
    const fromAccountControl = this.transactionForm.get('fromAccountId');
    const toAccountControl = this.transactionForm.get('toAccountId');
    const amountControl = this.transactionForm.get('amount');

    // Reset validators
    fromAccountControl?.clearValidators();
    toAccountControl?.clearValidators();
    
    if (this.selectedType === 'DEPOSIT') {
      toAccountControl?.setValidators([Validators.required]);
      fromAccountControl?.setValue('');
    } else if (this.selectedType === 'WITHDRAW') {
      fromAccountControl?.setValidators([Validators.required]);
      toAccountControl?.setValue('');
    } else if (this.selectedType === 'TRANSFER') {
      fromAccountControl?.setValidators([Validators.required]);
      toAccountControl?.setValidators([Validators.required]);
    }

    fromAccountControl?.updateValueAndValidity();
    toAccountControl?.updateValueAndValidity();
    
    // Update amount validators
    this.updateAmountValidators();
  }

  onFromAccountChange(): void {
    const fromAccountId = this.transactionForm.get('fromAccountId')?.value;
    this.selectedFromAccount = this.availableAccounts.find(acc => acc.accountId === fromAccountId);
    this.updateAmountValidators();
  }

  updateAmountValidators(): void {
    const amountControl = this.transactionForm.get('amount');
    const validators = [Validators.required, Validators.min(0.01)];

    if (this.selectedFromAccount && (this.selectedType === 'WITHDRAW' || this.selectedType === 'TRANSFER')) {
      validators.push(Validators.max(this.selectedFromAccount.balance));
    }

    amountControl?.setValidators(validators);
    amountControl?.updateValueAndValidity();
  }

  getToAccountOptions(): Account[] {
    if (this.selectedType === 'TRANSFER') {
      const fromAccountId = this.transactionForm.get('fromAccountId')?.value;
      return this.availableAccounts.filter(acc => acc.accountId !== fromAccountId);
    }
    return this.availableAccounts;
  }

  getRemainingBalance(): number {
    if (!this.selectedFromAccount) return 0;
    
    const amount = this.transactionForm.get('amount')?.value || 0;
    if (this.selectedType === 'WITHDRAW' || this.selectedType === 'TRANSFER') {
      return this.selectedFromAccount.balance - amount;
    }
    return this.selectedFromAccount.balance;
  }

  getRemainingBalanceClass(): string {
    const remaining = this.getRemainingBalance();
    if (remaining > 0) return 'remaining-positive';
    if (remaining === 0) return 'remaining-zero';
    return 'remaining-negative';
  }

  isSameAccount(): boolean {
    if (this.selectedType !== 'TRANSFER') return false;
    
    const fromId = this.transactionForm.get('fromAccountId')?.value;
    const toId = this.transactionForm.get('toAccountId')?.value;
    return fromId && toId && fromId === toId;
  }

  getPageTitle(): string {
    switch (this.selectedType) {
      case 'DEPOSIT': return 'Deposit Money';
      case 'WITHDRAW': return 'Withdraw Money';
      case 'TRANSFER': return 'Transfer Money';
      default: return 'New Transaction';
    }
  }

  getSubmitIcon(): string {
    switch (this.selectedType) {
      case 'DEPOSIT': return 'add';
      case 'WITHDRAW': return 'remove';
      case 'TRANSFER': return 'swap_horiz';
      default: return 'save';
    }
  }

  getSubmitText(): string {
    if (this.isSubmitting) {
      return 'Processing...';
    }
    
    switch (this.selectedType) {
      case 'DEPOSIT': return 'Deposit Money';
      case 'WITHDRAW': return 'Withdraw Money';
      case 'TRANSFER': return 'Transfer Money';
      default: return 'Submit Transaction';
    }
  }

  onSubmit(): void {
    if (this.transactionForm.invalid || this.isSubmitting || this.isSameAccount()) {
      return;
    }

    this.isSubmitting = true;
    this.loadingService.show();

    const formValue = this.transactionForm.value;

    switch (this.selectedType) {
      case 'DEPOSIT':
        this.processDeposit(formValue);
        break;
      case 'WITHDRAW':
        this.processWithdraw(formValue);
        break;
      case 'TRANSFER':
        this.processTransfer(formValue);
        break;
    }
  }

  private processDeposit(formValue: any): void {
    const request: DepositRequest = {
      accountId: formValue.toAccountId,
      amount: formValue.amount,
      description: formValue.description || undefined
    };

    this.transactionService.deposit(request).subscribe({
      next: () => {
        this.notificationService.showSuccess('Deposit completed successfully');
        this.dataRefreshService.updateTransactionTime(); // Trigger refresh
        this.router.navigate(['/accounts', formValue.toAccountId]);
      },
      error: (error) => {
        console.error('Deposit error:', error);
        this.notificationService.showError('Failed to complete deposit');
        this.isSubmitting = false;
        this.loadingService.hide();
      }
    });
  }

  private processWithdraw(formValue: any): void {
    const request: WithdrawRequest = {
      accountId: formValue.fromAccountId,
      amount: formValue.amount,
      description: formValue.description || undefined
    };

    this.transactionService.withdraw(request).subscribe({
      next: () => {
        this.notificationService.showSuccess('Withdrawal completed successfully');
        this.dataRefreshService.updateTransactionTime(); // Trigger refresh
        this.router.navigate(['/accounts', formValue.fromAccountId]);
      },
      error: (error) => {
        console.error('Withdrawal error:', error);
        this.notificationService.showError('Failed to complete withdrawal');
        this.isSubmitting = false;
        this.loadingService.hide();
      }
    });
  }

  private processTransfer(formValue: any): void {
    const request: TransferRequest = {
      fromAccountId: formValue.fromAccountId,
      toAccountId: formValue.toAccountId,
      amount: formValue.amount,
      description: formValue.description || undefined
    };

    this.transactionService.transfer(request).subscribe({
      next: () => {
        this.notificationService.showSuccess('Transfer completed successfully');
        this.dataRefreshService.updateTransactionTime(); // Trigger refresh
        this.router.navigate(['/accounts', formValue.fromAccountId]);
      },
      error: (error) => {
        console.error('Transfer error:', error);
        this.notificationService.showError('Failed to complete transfer');
        this.isSubmitting = false;
        this.loadingService.hide();
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/transactions']);
  }
}