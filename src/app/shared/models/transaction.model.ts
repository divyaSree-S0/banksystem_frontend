export interface Transaction {
  transactionId?: number;
  accountId: number;
  accountNumber?: string;
  amount: number;
  type: string;
  dateTime: Date | string;
  description?: string;
}

export interface DepositRequest {
  accountId: number;
  amount: number;
  description?: string;
}

export interface WithdrawRequest {
  accountId: number;
  amount: number;
  description?: string;
}

export interface TransferRequest {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  description?: string;
}