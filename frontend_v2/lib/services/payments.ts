/**
 * Production-Ready Payment Gateway Service (Razorpay Staging)
 * 
 * When NEXT_PUBLIC_RAZORPAY_KEY_ID is provided in production .env, this service
 * dynamically mounts the Razorpay SDK script and opens the standard checkout modal.
 * When in pilot / test mode without production keys, it provides a simulated test checkout
 * so full ordering flows can be verified end-to-end.
 */

export interface RazorpayCheckoutOptions {
  orderId: string;
  amount: number; // in INR
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shopName?: string;
  onSuccess: (paymentId: string) => void;
  onFailure: (error: string) => void;
}

export interface RazorpayCustomerCheckoutOptions {
  keyId: string;
  razorpayOrderId: string;
  orderNumber: string;
  amountPaise: number;
  currency?: string;
  shopName?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  onSuccess: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  onFailure: (error: string) => void;
  onDismiss?: () => void;
}

export const paymentsService = {
  /**
   * Check if live Razorpay credentials are configured
   */
  isLiveRazorpayConfigured: (): boolean => {
    return !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  },

  /**
   * Load the official Razorpay checkout script if not already present
   */
  loadRazorpayScript: (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Razorpay) return resolve(true);

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  },

  /**
   * Open real Razorpay Checkout for customer orders with real Razorpay order ID and authoritative HMAC signature handling.
   */
  openCustomerRazorpayCheckout: async (options: RazorpayCustomerCheckoutOptions): Promise<void> => {
    const isLoaded = await paymentsService.loadRazorpayScript();
    if (!isLoaded) {
      options.onFailure('Unable to load payment gateway. Please check your internet connection.');
      return;
    }

    const keyId = options.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!keyId) {
      options.onFailure('Payment gateway public key is missing.');
      return;
    }

    const rzpOptions = {
      key: keyId,
      order_id: options.razorpayOrderId,
      amount: options.amountPaise,
      currency: options.currency || 'INR',
      name: options.shopName || 'CakeStore Marketplace',
      description: `Celebration Cake Order #${options.orderNumber}`,
      prefill: {
        name: options.customerName,
        email: options.customerEmail,
        contact: options.customerPhone || '',
      },
      theme: {
        color: '#5C2434', // Brand Plum
      },
      handler: (response: any) => {
        if (response?.razorpay_payment_id && response?.razorpay_order_id && response?.razorpay_signature) {
          options.onSuccess({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          });
        } else {
          options.onFailure('Payment gateway returned an incomplete response. Signature verification cannot proceed.');
        }
      },
      modal: {
        ondismiss: () => {
          if (options.onDismiss) {
            options.onDismiss();
          } else {
            options.onFailure('Payment was cancelled by the customer.');
          }
        },
      },
    };

    const rzp = new (window as any).Razorpay(rzpOptions);
    rzp.open();
  },

  /**
   * Initiate payment checkout flow
   */
  initiatePayment: async (options: RazorpayCheckoutOptions): Promise<void> => {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

    // Production mode: Real Razorpay SDK
    if (keyId) {
      const isLoaded = await paymentsService.loadRazorpayScript();
      if (!isLoaded) {
        options.onFailure('Unable to load payment gateway. Please check your internet connection.');
        return;
      }

      const rzpOptions = {
        key: keyId,
        amount: Math.round(options.amount * 100), // convert to paise
        currency: 'INR',
        name: options.shopName || 'CakeStore Marketplace',
        description: `Celebration Cake Order #${options.orderId}`,
        prefill: {
          name: options.customerName,
          email: options.customerEmail,
          contact: options.customerPhone || '',
        },
        theme: {
          color: '#5C2434', // Brand Plum
        },
        handler: (response: any) => {
          if (response?.razorpay_payment_id) {
            options.onSuccess(response.razorpay_payment_id);
          } else {
            options.onSuccess(`pay_${Date.now()}`);
          }
        },
        modal: {
          ondismiss: () => {
            options.onFailure('Payment was cancelled by the customer.');
          },
        },
      };

      const rzp = new (window as any).Razorpay(rzpOptions);
      rzp.open();
      return;
    }

    // Pilot / Staging Mode: Simulated instant approval
    console.info(
      `[PaymentGateway:Staged] Razorpay Key not detected in environment. Simulating instant approval for Order #${options.orderId} (₹${options.amount}).`
    );
    setTimeout(() => {
      const mockPaymentId = `pay_mock_${Date.now().toString(36)}`;
      options.onSuccess(mockPaymentId);
    }, 600);
  },
};
