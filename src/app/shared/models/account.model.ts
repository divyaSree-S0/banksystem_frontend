export enum AccountType {
  SAVINGS = 'SAVINGS',
  CURRENT = 'CURRENT'
}

export interface Account {
  accountId?: number;
  accountNumber: string;
  balance: number;
  accountType: AccountType;
  customerId: number;
  customerName?: string;
}

export interface CreateAccountRequest {
  customerId: number;
  accountType: AccountType;
  initialBalance: number;
}