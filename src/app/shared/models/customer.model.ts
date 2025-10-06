export interface Customer {
  customerId?: number;
  customerName: string;
  phoneNo: string;
  address: string;
  email: string;
  password?: string;
}

export interface CreateCustomerRequest {
  customerName: string;
  phoneNo: string;
  address: string;
  email: string;
  password: string;
}