"""
Subscription & Payment Routes
Handles subscription management and payment processing
"""
from flask import Blueprint, request, jsonify
from services.supabase_service import SupabaseService
from services.auth_service import require_auth, require_premium
from datetime import datetime, timedelta
import os

subscriptions_bp = Blueprint('subscriptions', __name__)
db_service = SupabaseService()

# Subscription pricing in KES
SUBSCRIPTION_PRICES = {
    'free': 0,
    'premium1': 2000,
    'premium2': 5000
}


@subscriptions_bp.route('/payments/checkout-session', methods=['POST'])
@require_auth
def create_checkout_session():
    """Create payment checkout session for subscription"""
    try:
        data = request.get_json()
        tier = data.get('tier')
        
        if tier not in ['premium1', 'premium2']:
            return jsonify({
                'code': 'VALIDATION_ERROR',
                'message': 'Invalid subscription tier'
            }), 400
        
        user_id = request.current_user['user_id']
        user = db_service.get_user_by_id(user_id)
        
        if not user or not user['verified']:
            return jsonify({
                'code': 'EMAIL_NOT_VERIFIED',
                'message': 'Please verify your email before purchasing a subscription'
            }), 403
        
        # Check if user already has active subscription
        existing_sub = db_service.get_user_subscription(user_id)
        if existing_sub and existing_sub['status'] == 'active':
            return jsonify({
                'code': 'SUBSCRIPTION_EXISTS',
                'message': 'You already have an active subscription'
            }), 400
        
        # Create checkout session based on provider
        provider = os.getenv('PAYMENT_PROVIDER', 'stripe')  # 'stripe' or 'mpesa'
        
        if provider == 'stripe':
            return _create_stripe_checkout(user_id, tier)
        elif provider == 'mpesa':
            return _create_mpesa_checkout(user_id, tier)
        else:
            # Development mode - simulate payment
            return _simulate_payment(user_id, tier)
    
    except Exception as e:
        print(f"Create checkout session error: {e}")
        return jsonify({
            'code': 'INTERNAL_ERROR',
            'message': 'Failed to create checkout session'
        }), 500


def _create_stripe_checkout(user_id: str, tier: str):
    """Create Stripe checkout session"""
    try:
        import stripe
        stripe.api_key = os.getenv('STRIPE_SECRET_KEY', '')
        
        price_id = os.getenv(f'STRIPE_PRICE_ID_{tier.upper()}', '')
        
        checkout_session = stripe.checkout.Session.create(
            customer_email=db_service.get_user_by_id(user_id)['email'],
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=f"{os.getenv('APP_URL', 'http://localhost:3000')}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{os.getenv('APP_URL', 'http://localhost:3000')}/subscription/cancel",
            metadata={
                'user_id': user_id,
                'tier': tier
            }
        )
        
        return jsonify({
            'checkout_url': checkout_session.url,
            'session_id': checkout_session.id
        }), 200
    
    except Exception as e:
        print(f"Stripe checkout error: {e}")
        return jsonify({
            'code': 'PAYMENT_ERROR',
            'message': 'Failed to create Stripe checkout session'
        }), 500


def _create_mpesa_checkout(user_id: str, tier: str):
    """Create M-Pesa checkout (Safaricom Daraja API)"""
    # This is a placeholder - implement M-Pesa integration
    return jsonify({
        'code': 'NOT_IMPLEMENTED',
        'message': 'M-Pesa integration not yet implemented'
    }), 501


def _simulate_payment(user_id: str, tier: str):
    """Simulate payment for development"""
    # In development, create subscription directly
    expires_at = datetime.utcnow() + timedelta(days=30)
    
    subscription = db_service.create_subscription(
        user_id=user_id,
        tier=tier,
        provider='simulated',
        expires_at=expires_at
    )
    
    return jsonify({
        'message': 'Subscription created (simulated)',
        'subscription': subscription
    }), 200


@subscriptions_bp.route('/payments/webhook', methods=['POST'])
def payment_webhook():
    """Handle payment webhook from Stripe/M-Pesa"""
    try:
        provider = os.getenv('PAYMENT_PROVIDER', 'stripe')
        
        if provider == 'stripe':
            return _handle_stripe_webhook()
        elif provider == 'mpesa':
            return _handle_mpesa_webhook()
        else:
            return jsonify({'message': 'Webhook received'}), 200
    
    except Exception as e:
        print(f"Webhook error: {e}")
        return jsonify({
            'code': 'WEBHOOK_ERROR',
            'message': 'Webhook processing failed'
        }), 500


def _handle_stripe_webhook():
    """Handle Stripe webhook"""
    import stripe
    stripe.api_key = os.getenv('STRIPE_SECRET_KEY', '')
    webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET', '')
    
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError:
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError:
        return jsonify({'error': 'Invalid signature'}), 400
    
    # Handle subscription events
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        user_id = session['metadata'].get('user_id')
        tier = session['metadata'].get('tier')
        
        if user_id and tier:
            expires_at = datetime.utcnow() + timedelta(days=30)
            db_service.create_subscription(
                user_id=user_id,
                tier=tier,
                provider='stripe',
                provider_subscription_id=session.get('subscription')
            )
    
    elif event['type'] == 'customer.subscription.deleted':
        subscription_id = event['data']['object']['id']
        # Update subscription status to canceled
        # Implementation depends on your schema
    
    return jsonify({'status': 'success'}), 200


def _handle_mpesa_webhook():
    """Handle M-Pesa webhook"""
    # Placeholder for M-Pesa webhook handling
    return jsonify({'message': 'M-Pesa webhook received'}), 200


@subscriptions_bp.route('/subscriptions/current', methods=['GET'])
@require_auth
def get_current_subscription():
    """Get current user's subscription"""
    try:
        user_id = request.current_user['user_id']
        subscription = db_service.get_user_subscription(user_id)
        
        return jsonify({
            'subscription': subscription
        }), 200
    
    except Exception as e:
        print(f"Get subscription error: {e}")
        return jsonify({
            'code': 'INTERNAL_ERROR',
            'message': 'Failed to fetch subscription'
        }), 500


@subscriptions_bp.route('/subscriptions/cancel', methods=['POST'])
@require_auth
def cancel_subscription():
    """Cancel current subscription"""
    try:
        user_id = request.current_user['user_id']
        subscription = db_service.get_user_subscription(user_id)
        
        if not subscription:
            return jsonify({
                'code': 'NO_SUBSCRIPTION',
                'message': 'No active subscription found'
            }), 404
        
        # Update subscription status
        db_service.update_subscription_status(subscription['id'], 'canceled')
        
        # Update user tier to free
        db_service.update_user(user_id, subscription_tier='free')
        
        # Log audit
        db_service.create_audit_log(
            user_id=user_id,
            action='subscription_canceled',
            ip_address=request.remote_addr
        )
        
        return jsonify({
            'message': 'Subscription canceled'
        }), 200
    
    except Exception as e:
        print(f"Cancel subscription error: {e}")
        return jsonify({
            'code': 'INTERNAL_ERROR',
            'message': 'Failed to cancel subscription'
        }), 500


