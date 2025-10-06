import { Injectable } from '@angular/core';

export interface NotificationMessage {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  showSuccess(message: string, duration: number = 3000): void {
    this.show({
      message,
      type: 'success',
      duration
    });
  }

  showError(message: string, duration: number = 5000): void {
    this.show({
      message,
      type: 'error',
      duration
    });
  }

  showWarning(message: string, duration: number = 4000): void {
    this.show({
      message,
      type: 'warning',
      duration
    });
  }

  showInfo(message: string, duration: number = 3000): void {
    this.show({
      message,
      type: 'info',
      duration
    });
  }

  private show(notification: NotificationMessage): void {
    // Implementation will be added when we integrate with Material Snackbar or similar
    console.log(`${notification.type.toUpperCase()}: ${notification.message}`);
  }
}