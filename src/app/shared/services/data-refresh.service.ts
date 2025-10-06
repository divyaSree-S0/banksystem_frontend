import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataRefreshService {
  private _refreshTrigger = new Subject<string>();
  private _lastTransactionTime = new BehaviorSubject<number>(Date.now());

  // Observable for components to subscribe to refresh events
  public refreshTrigger$ = this._refreshTrigger.asObservable();
  public lastTransactionTime$ = this._lastTransactionTime.asObservable();

  constructor() {}

  // Trigger refresh for specific component or all components
  triggerRefresh(component?: string): void {
    this._refreshTrigger.next(component || 'all');
  }

  // Update the timestamp when a transaction occurs
  updateTransactionTime(): void {
    this._lastTransactionTime.next(Date.now());
    this.triggerRefresh('all');
  }

  // Trigger refresh for dashboard
  refreshDashboard(): void {
    this.triggerRefresh('dashboard');
  }

  // Trigger refresh for transactions
  refreshTransactions(): void {
    this.triggerRefresh('transactions');
  }

  // Trigger refresh for accounts
  refreshAccounts(): void {
    this.triggerRefresh('accounts');
  }
}