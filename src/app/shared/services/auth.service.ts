import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';

import { User, LoginRequest, LoginResponse, AuthState, SignupRequest, SignupResponse } from '@shared/models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:8080/api/auth';
  private readonly TOKEN_KEY = 'banking_auth_token';
  private readonly USER_KEY = 'banking_user_data';

  private readonly authStateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null
  });

  public authState$ = this.authStateSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {
    this.initializeAuthState();
  }

  /**
   * Initialize authentication state from localStorage
   */
  private initializeAuthState(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userData = localStorage.getItem(this.USER_KEY);

    if (token && userData) {
      try {
        const user: User = JSON.parse(userData);
        this.authStateSubject.next({
          isAuthenticated: true,
          user,
          token
        });
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        this.logout();
      }
    }
  }

  /**
   * Login with username and password
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    // Use backend authentication instead of simulation
    return this.authenticateWithBackend(credentials).pipe(
      tap(response => {
        this.setAuthState(response);
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Authenticate with backend API
   */
  private authenticateWithBackend(credentials: LoginRequest): Observable<LoginResponse> {
    const loginRequest = {
      username: credentials.username, // Send username as-is
      password: credentials.password
    };

    return this.http.post<any>('http://localhost:8080/api/customers/login', loginRequest).pipe(
      switchMap((response: any) => {
        if (response.token && response.user) {
          const loginResponse: LoginResponse = {
            token: response.token,
            user: {
              id: response.user.customerId,
              username: response.user.username || response.user.email, // Use username if available, fallback to email
              email: response.user.email,
              fullName: response.user.customerName,
              role: response.user.role || 'USER' // Use role from backend or default to USER
            },
            expiresIn: response.expiresIn || 3600
          };
          return of(loginResponse);
        } else {
          return throwError(() => ({ message: 'Invalid username or password' }));
        }
      }),
      catchError(error => {
        console.error('Backend authentication failed:', error);
        let errorMessage = 'Authentication failed';
        
        if (error.status === 401) {
          errorMessage = error.error?.message || 'Invalid username or password';
        } else if (error.status === 0) {
          errorMessage = 'Cannot connect to server';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        return throwError(() => ({ message: errorMessage }));
      })
    );
  }

  /**
   * Signup new user by creating a customer in the backend
   */
  signup(signupData: SignupRequest): Observable<SignupResponse> {
    const customerRequest = {
      customerName: `${signupData.firstName} ${signupData.lastName}`,
      phoneNo: signupData.phoneNumber,
      address: signupData.address,
      email: signupData.email,
      username: signupData.username,
      password: signupData.password
    };

    // Use the correct customer creation endpoint
    return this.http.post<SignupResponse>('http://localhost:8080/api/customers', customerRequest).pipe(
      tap(response => {
        console.log('Customer created successfully:', response);
      }),
      catchError(error => {
        console.error('Signup error:', error);
        let errorMessage = 'Failed to create account. Please try again.';
        
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 409) {
          errorMessage = 'An account with this email already exists.';
        } else if (error.status === 400) {
          errorMessage = 'Invalid information provided. Please check your details.';
        } else if (error.status === 0) {
          errorMessage = 'Cannot connect to server. Please check if the backend is running.';
        }
        
        return throwError(() => ({ message: errorMessage }));
      })
    );
  }

  /**
   * Simulate login for demo purposes
   * Replace this with actual HTTP call to backend
   */
  private simulateLogin(credentials: LoginRequest): Observable<LoginResponse> {
    // Simulate API delay
    return new Observable(observer => {
      setTimeout(() => {
        // Demo credentials
        if (credentials.username === 'admin' && credentials.password === 'Admin123!') {
          const response: LoginResponse = {
            token: 'demo-jwt-token-' + Date.now(),
            user: {
              id: 1,
              username: 'admin',
              email: 'admin@banksystem.com',
              fullName: 'System Administrator',
              role: 'ADMIN'
            },
            expiresIn: 3600
          };
          observer.next(response);
          observer.complete();
        } else if (credentials.username === 'user' && credentials.password === 'user123') {
          const response: LoginResponse = {
            token: 'demo-jwt-token-' + Date.now(),
            user: {
              id: 2,
              username: 'user',
              email: 'user@banksystem.com',
              fullName: 'Bank User',
              role: 'USER'
            },
            expiresIn: 3600
          };
          observer.next(response);
          observer.complete();
        } else {
          observer.error({ message: 'Invalid username or password' });
        }
      }, 1000); // Simulate 1 second delay
    });
  }

  /**
   * Set authentication state and store in localStorage
   */
  private setAuthState(response: LoginResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));

    this.authStateSubject.next({
      isAuthenticated: true,
      user: response.user,
      token: response.token
    });
  }

  /**
   * Logout user and clear state
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);

    this.authStateSubject.next({
      isAuthenticated: false,
      user: null,
      token: null
    });

    this.router.navigate(['/login']);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authStateSubject.value.isAuthenticated;
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.authStateSubject.value.user;
  }

  /**
   * Get current auth token
   */
  getToken(): string | null {
    return this.authStateSubject.value.token;
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: 'ADMIN' | 'USER'): boolean {
    const user = this.getCurrentUser();
    return user?.role === role || false;
  }

  /**
   * Get authorization header for HTTP requests
   */
  getAuthHeaders(): { [key: string]: string } {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}