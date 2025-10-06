import { Routes } from '@angular/router';
import { AuthGuard, LoginGuard, adminGuard } from '@shared/guards';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./components/auth/login.component').then(m => m.LoginComponent),
    canActivate: [LoginGuard]
  },
  {
    path: 'signup',
    loadComponent: () => import('./components/auth/signup.component').then(m => m.SignupComponent),
    canActivate: [LoginGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'customers',
    loadChildren: () => import('./components/customers/customers.routes').then(m => m.customersRoutes),
    canActivate: [AuthGuard, adminGuard]
  },
  {
    path: 'accounts',
    loadChildren: () => import('./components/accounts/accounts.routes').then(m => m.accountsRoutes),
    canActivate: [AuthGuard]
  },
  {
    path: 'transactions',
    loadChildren: () => import('./components/transactions/transactions.routes').then(m => m.transactionsRoutes),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];