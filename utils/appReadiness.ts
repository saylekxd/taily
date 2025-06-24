// Global app readiness manager to prevent speech functionality from running too early
class AppReadinessManager {
  private isReady = false;
  private readyCallbacks: (() => void)[] = [];

  setReady() {
    this.isReady = true;
    console.log('App is ready - speech functionality enabled');
    
    // Execute any pending callbacks
    this.readyCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in ready callback:', error);
      }
    });
    this.readyCallbacks = [];
  }

  isAppReady(): boolean {
    return this.isReady;
  }

  onReady(callback: () => void) {
    if (this.isReady) {
      callback();
    } else {
      this.readyCallbacks.push(callback);
    }
  }

  async waitForReady(timeout = 5000): Promise<boolean> {
    if (this.isReady) {
      return true;
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve(false);
      }, timeout);

      this.onReady(() => {
        clearTimeout(timeoutId);
        resolve(true);
      });
    });
  }
}

export const appReadinessManager = new AppReadinessManager(); 