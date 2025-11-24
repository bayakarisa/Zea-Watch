"""
Supabase Database Service for ZeaWatch (improved)
Handles all database operations using Supabase Python client
"""
import os
import json
from supabase import create_client, Client
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import uuid

# Prefer the service role key name; fall back to legacy name for compatibility
_SUPABASE_URL = os.getenv('SUPABASE_URL', '')
_SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY', '')


class SupabaseService:
    """Supabase database service"""

    def __init__(self):
        supabase_url = _SUPABASE_URL
        supabase_key = _SUPABASE_KEY

        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY) must be set")

        self.supabase: Client = create_client(supabase_url, supabase_key)
        print("✅ Supabase client initialized successfully")

    # ---------------------------
    # Helper utilities
    # ---------------------------
    def _now_iso(self) -> str:
        return datetime.utcnow().isoformat()

    # ========================================================================
    # USER OPERATIONS
    # ========================================================================
    def create_user(self, name: str, email: str, password_hash: str,
                    preferred_language: str = 'en', role: str = 'user') -> Optional[Dict]:
        """Create a new user in the users table"""
        try:
            user_id = uuid.uuid4()
            payload = {
                'id': str(user_id),
                'name': name,
                'email': email,
                'password_hash': password_hash,
                'preferred_language': preferred_language,
                'role': role,
                'verified': False,
                'subscription_tier': 'free',
                'created_at': self._now_iso()
            }
            result = self.supabase.table('users').insert(payload).execute()
            if result.data:
                return result.data[0]
            return None
        except Exception as e:
            print(f"Error creating user: {e}")
            raise

    def email_exists(self, email: str) -> bool:
        """Check whether an email already exists"""
        try:
            res = self.supabase.table('users').select('id').eq('email', email).limit(1).execute()
            return bool(res.data)
        except Exception as e:
            print(f"Error checking email existence: {e}")
            return False

    def get_user_for_auth(self, email: str) -> Optional[Dict]:
        """
        Return minimal fields required for authentication (including password_hash).
        Use this for login flow to avoid sending password_hash to other parts.
        """
        try:
            result = (self.supabase.table('users')
                      .select('id, email, password_hash, role, subscription_tier, verified')
                      .eq('email', email)
                      .limit(1)
                      .execute())
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception as e:
            print(f"Error in get_user_for_auth: {e}")
            return None

    def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email (full record)"""
        try:
            result = self.supabase.table('users').select('*').eq('email', email).limit(1).execute()
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception as e:
            print(f"Error getting user by email: {e}")
            return None

    def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Get user by ID"""
        try:
            result = self.supabase.table('users').select('*').eq('id', user_id).limit(1).execute()
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception as e:
            print(f"Error getting user by id: {e}")
            return None

    def update_user(self, user_id: str, **kwargs) -> Optional[Dict]:
        """Update user fields"""
        allowed_fields = ['name', 'preferred_language', 'verified', 'last_login',
                          'subscription_tier', 'payment_customer_id', 'password_hash']
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}

        if not updates:
            return None

        updates['updated_at'] = self._now_iso()

        try:
            result = self.supabase.table('users').update(updates).eq('id', user_id).execute()
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception as e:
            print(f"Error updating user: {e}")
            return None

    def update_last_login(self, user_id: str) -> bool:
        """Update last_login timestamp"""
        try:
            self.supabase.table('users').update({'last_login': self._now_iso()}).eq('id', user_id).execute()
            return True
        except Exception as e:
            print(f"Error updating last login: {e}")
            return False

    def delete_user(self, user_id: str) -> bool:
        """Delete user (admin)"""
        try:
            self.supabase.table('users').delete().eq('id', user_id).execute()
            return True
        except Exception as e:
            print(f"Error deleting user: {e}")
            return False

    # ========================================================================
    # EMAIL VERIFICATION
    # ========================================================================
    def create_verification_token(self, user_id: str, token: str,
                                  expires_in_hours: int = 24) -> bool:
        """Create email verification token"""
        expires_at = datetime.utcnow() + timedelta(hours=expires_in_hours)
        try:
            self.supabase.table('email_verification_tokens').insert({
                'user_id': user_id,
                'token': token,
                'expires_at': expires_at.isoformat()
            }).execute()
            return True
        except Exception as e:
            print(f"Error creating verification token: {e}")
            return False

    def verify_token(self, token: str) -> Optional[str]:
        """Verify token and return user_id if valid"""
        try:
            result = (self.supabase.table('email_verification_tokens')
                      .select('user_id')
                      .eq('token', token)
                      .gt('expires_at', datetime.utcnow().isoformat())
                      .limit(1)
                      .execute())

            if result.data and len(result.data) > 0:
                user_id = result.data[0]['user_id']
                # Delete token after use
                self.supabase.table('email_verification_tokens').delete().eq('token', token).execute()
                return user_id
            return None
        except Exception as e:
            print(f"Error verifying token: {e}")
            return None

    # ========================================================================
    # PASSWORD RESET
    # ========================================================================
    def create_password_reset_token(self, user_id: str, token: str,
                                    expires_in_hours: int = 1) -> bool:
        """Create password reset token"""
        expires_at = datetime.utcnow() + timedelta(hours=expires_in_hours)
        try:
            self.supabase.table('password_reset_tokens').insert({
                'user_id': user_id,
                'token': token,
                'expires_at': expires_at.isoformat(),
                'used': False
            }).execute()
            return True
        except Exception as e:
            print(f"Error creating password reset token: {e}")
            return False

    def verify_password_reset_token(self, token: str) -> Optional[str]:
        """Verify password reset token"""
        try:
            result = (self.supabase.table('password_reset_tokens')
                      .select('user_id')
                      .eq('token', token)
                      .eq('used', False)
                      .gt('expires_at', datetime.utcnow().isoformat())
                      .limit(1)
                      .execute())

            if result.data and len(result.data) > 0:
                return result.data[0]['user_id']
            return None
        except Exception as e:
            print(f"Error verifying password reset token: {e}")
            return None

    def mark_password_reset_token_used(self, token: str) -> bool:
        """Mark password reset token as used"""
        try:
            result = self.supabase.table('password_reset_tokens').update({'used': True}).eq('token', token).execute()
            return result.data is not None
        except Exception as e:
            print(f"Error marking token as used: {e}")
            return False

    # ========================================================================
    # PREDICTIONS
    # ========================================================================
    def save_prediction(self, user_id: Optional[str], image_url: Optional[str],
                    label: str, confidence: float, raw_scores: Dict,
                    model_version: str, description: Optional[str] = None,
                    recommendation: Optional[str] = None,
                    latitude: Optional[float] = None,
                    longitude: Optional[float] = None,
                    field_name: Optional[str] = None) -> Dict:
        """Save analysis with normalized confidence and sanitized fields"""
        # Ensure confidence is number and in [0, 1]
        try:
            confidence = float(confidence)
        except Exception:
            confidence = 0.0
        confidence = max(0.0, min(1.0, confidence))

        # sanitize coords
        try:
            latitude = float(latitude) if latitude is not None else None
        except Exception:
            latitude = None
        try:
            longitude = float(longitude) if longitude is not None else None
        except Exception:
            longitude = None

        # ensure raw_scores is json-serializable (dict)
        if raw_scores is None:
            raw_scores = {}
        if not isinstance(raw_scores, dict):
            try:
                raw_scores = json.loads(raw_scores)
            except Exception:
                raw_scores = {"value": str(raw_scores)}

        payload = {
            'user_id': user_id,
            'image_url': image_url,
            'disease': label,  # Changed from 'label' to 'disease' to match analyses table
            'confidence': confidence,
            'description': description,
            'recommendation': recommendation,
            'created_at': self._now_iso()
        }

        try:
            result = self.supabase.table('analyses').insert(payload).execute()  # Changed to 'analyses'
            if result.data and len(result.data) > 0:
                return result.data[0]
            return {}
        except Exception as e:
            print(f"Error saving analysis: {e}")
            raise

    def get_prediction_by_id(self, prediction_id: str) -> Optional[Dict]:
        """Get a single prediction by id"""
        try:
            result = self.supabase.table('predictions').select('*').eq('id', prediction_id).limit(1).execute()
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception as e:
            print(f"Error getting prediction by id: {e}")
            return None

    def get_user_analyses(self, user_id: str, limit: int = 100,
                             offset: int = 0) -> List[Dict]:
        """Get analyses for a user"""
        try:
            result = (self.supabase.table('analyses')
                      .select('*')
                      .eq('user_id', user_id)
                      .order('created_at', desc=True)
                      .limit(limit)
                      .offset(offset)
                      .execute())
            return result.data if result.data else []
        except Exception as e:
            print(f"Error getting user analyses: {e}")
            return []

    def get_all_predictions(self, limit: int = 100, offset: int = 0,
                            filters: Optional[Dict] = None) -> List[Dict]:
        """Get all predictions (admin)"""
        try:
            query = self.supabase.table('predictions').select('*')

            if filters:
                if filters.get('user_id'):
                    query = query.eq('user_id', filters['user_id'])
                if filters.get('label'):
                    query = query.ilike('label', f"%{filters['label']}%")

            result = query.order('created_at', desc=True).limit(limit).offset(offset).execute()
            return result.data if result.data else []
        except Exception as e:
            print(f"Error getting all predictions: {e}")
            return []

    def delete_analysis(self, analysis_id: str) -> bool:
        """Delete an analysis"""
        try:
            self.supabase.table('analyses').delete().eq('id', analysis_id).execute()
            return True
        except Exception as e:
            print(f"Error deleting analysis: {e}")
            return False

    # recent/activity helpers
    def get_recent_predictions(self, days: int = 7) -> List[Dict]:
        """Get predictions created in the last `days` days"""
        try:
            cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
            res = self.supabase.table('predictions').select('*').gt('created_at', cutoff).order('created_at', desc=True).execute()
            return res.data if res.data else []
        except Exception as e:
            print(f"Error in get_recent_predictions: {e}")
            return []

    def get_daily_prediction_counts(self, last_n_days: int = 30) -> List[Dict]:
        """Return daily counts for the last N days (simple approach)"""
        try:
            # This naive approach pulls data and aggregates in Python
            cutoff = (datetime.utcnow() - timedelta(days=last_n_days)).isoformat()
            res = self.supabase.table('predictions').select('created_at').gt('created_at', cutoff).execute()
            if not res.data:
                return []
            counts = {}
            for row in res.data:
                created = row.get('created_at')
                if not created:
                    continue
                # take date prefix
                date = created.split('T')[0]
                counts[date] = counts.get(date, 0) + 1
            # convert to list of dicts sorted by date
            return [{"date": d, "count": counts[d]} for d in sorted(counts.keys())]
        except Exception as e:
            print(f"Error in get_daily_prediction_counts: {e}")
            return []

    # ========================================================================
    # UPLOADS
    # ========================================================================
    def create_upload(self, user_id: str, filename: str, storage_path: str,
                      file_size: Optional[int] = None, mime_type: Optional[str] = None,
                      metadata: Optional[Dict] = None) -> Dict:
        """Create an upload record"""
        try:
            payload = {
                'user_id': user_id,
                'filename': filename,
                'storage_path': storage_path,
                'file_size': file_size,
                'mime_type': mime_type,
                'metadata': metadata or {},
                'created_at': self._now_iso()
            }
            result = self.supabase.table('uploads').insert(payload).execute()
            if result.data:
                return result.data[0]
            return {}
        except Exception as e:
            print(f"Error creating upload: {e}")
            raise

    def get_upload_by_id(self, upload_id: str) -> Optional[Dict]:
        """Fetch single upload"""
        try:
            result = self.supabase.table('uploads').select('*').eq('id', upload_id).limit(1).execute()
            if result.data:
                return result.data[0]
            return None
        except Exception as e:
            print(f"Error getting upload: {e}")
            return None

    def get_user_uploads(self, user_id: str, limit: int = 50, offset: int = 0) -> List[Dict]:
        """List uploads for user"""
        try:
            result = (self.supabase.table('uploads')
                      .select('*')
                      .eq('user_id', user_id)
                      .order('created_at', desc=True)
                      .limit(limit)
                      .offset(offset)
                      .execute())
            return result.data if result.data else []
        except Exception as e:
            print(f"Error listing uploads: {e}")
            return []

    def delete_upload(self, upload_id: str) -> bool:
        """Delete upload record"""
        try:
            self.supabase.table('uploads').delete().eq('id', upload_id).execute()
            return True
        except Exception as e:
            print(f"Error deleting upload: {e}")
            return False

    def get_all_uploads(self, limit: int = 100, offset: int = 0,
                        user_id: Optional[str] = None) -> List[Dict]:
        """Admin helper to list uploads"""
        try:
            query = self.supabase.table('uploads').select('*')
            if user_id:
                query = query.eq('user_id', user_id)
            result = query.order('created_at', desc=True).limit(limit).offset(offset).execute()
            return result.data if result.data else []
        except Exception as e:
            print(f"Error getting all uploads: {e}")
            return []

    # ========================================================================
    # RECOMMENDATIONS
    # ========================================================================
    def create_recommendation(self, user_id: str, recommendation_type: str,
                              content: Optional[Dict] = None, summary: Optional[str] = None,
                              score: Optional[float] = None) -> Dict:
        """Create recommendation record"""
        try:
            payload = {
                'user_id': user_id,
                'recommendation_type': recommendation_type,
                'content': content or {},
                'summary': summary,
                'score': score,
                'created_at': self._now_iso()
            }
            result = self.supabase.table('recommendations').insert(payload).execute()
            if result.data:
                return result.data[0]
            return {}
        except Exception as e:
            print(f"Error creating recommendation: {e}")
            raise

    def get_recommendation_by_id(self, rec_id: str) -> Optional[Dict]:
        """Fetch recommendation"""
        try:
            result = self.supabase.table('recommendations').select('*').eq('id', rec_id).limit(1).execute()
            if result.data:
                return result.data[0]
            return None
        except Exception as e:
            print(f"Error getting recommendation: {e}")
            return None

    def get_user_recommendations(self, user_id: str, limit: int = 50,
                                 offset: int = 0) -> List[Dict]:
        """List recommendations for user"""
        try:
            result = (self.supabase.table('recommendations')
                      .select('*')
                      .eq('user_id', user_id)
                      .order('created_at', desc=True)
                      .limit(limit)
                      .offset(offset)
                      .execute())
            return result.data if result.data else []
        except Exception as e:
            print(f"Error listing recommendations: {e}")
            return []

    def delete_recommendation(self, rec_id: str) -> bool:
        """Delete recommendation"""
        try:
            self.supabase.table('recommendations').delete().eq('id', rec_id).execute()
            return True
        except Exception as e:
            print(f"Error deleting recommendation: {e}")
            return False

    def get_all_recommendations(self, limit: int = 100, offset: int = 0,
                                user_id: Optional[str] = None) -> List[Dict]:
        """Admin helper to list recommendations"""
        try:
            query = self.supabase.table('recommendations').select('*')
            if user_id:
                query = query.eq('user_id', user_id)
            result = query.order('created_at', desc=True).limit(limit).offset(offset).execute()
            return result.data if result.data else []
        except Exception as e:
            print(f"Error getting all recommendations: {e}")
            return []

    # ========================================================================
    # SUBSCRIPTIONS
    # ========================================================================
    def create_subscription(self, user_id: str, tier: str, provider: str,
                            provider_subscription_id: Optional[str] = None,
                            expires_at: Optional[datetime] = None) -> Dict:
        """Create a subscription"""
        try:
            result = self.supabase.table('subscriptions').insert({
                'user_id': user_id,
                'tier': tier,
                'status': 'active',
                'provider': provider,
                'provider_subscription_id': provider_subscription_id,
                'expires_at': expires_at.isoformat() if expires_at else None,
                'created_at': self._now_iso()
            }).execute()

            # Update user subscription tier
            self.update_user(user_id, subscription_tier=tier)

            if result.data and len(result.data) > 0:
                return result.data[0]
            return {}
        except Exception as e:
            print(f"Error creating subscription: {e}")
            raise

    def update_subscription_status(self, subscription_id: str, status: str) -> bool:
        """Update subscription status"""
        try:
            result = self.supabase.table('subscriptions').update({'status': status}).eq('id', subscription_id).execute()
            return result.data is not None
        except Exception as e:
            print(f"Error updating subscription status: {e}")
            return False

    def get_user_subscription(self, user_id: str) -> Optional[Dict]:
        """Get active subscription for user"""
        try:
            result = (self.supabase.table('subscriptions')
                      .select('*')
                      .eq('user_id', user_id)
                      .eq('status', 'active')
                      .order('created_at', desc=True)
                      .limit(1)
                      .execute())
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception as e:
            print(f"Error getting user subscription: {e}")
            return None

    # ========================================================================
    # ADMIN OPERATIONS
    # ========================================================================
    def get_all_users(self, limit: int = 100, offset: int = 0,
                      filters: Optional[Dict] = None) -> List[Dict]:
        """Get all users (admin)"""
        try:
            query = self.supabase.table('users').select('id, name, email, role, verified, preferred_language, subscription_tier, created_at, last_login')

            if filters:
                if filters.get('email'):
                    query = query.ilike('email', f"%{filters['email']}%")
                if filters.get('verified') is not None:
                    query = query.eq('verified', filters['verified'])
                if filters.get('subscription_tier'):
                    query = query.eq('subscription_tier', filters['subscription_tier'])

            result = query.order('created_at', desc=True).limit(limit).offset(offset).execute()
            return result.data if result.data else []
        except Exception as e:
            print(f"Error getting all users: {e}")
            return []

    def get_admin_stats(self) -> Dict:
        """Get admin statistics"""
        try:
            stats = {}

            # Total users
            users_result = self.supabase.table('users').select('id', count='exact').execute()
            stats['total_users'] = users_result.count if hasattr(users_result, 'count') else 0

            # Verified users
            verified_result = self.supabase.table('users').select('id', count='exact').eq('verified', True).execute()
            stats['verified_users'] = verified_result.count if hasattr(verified_result, 'count') else 0

            # Active subscriptions
            subs_result = self.supabase.table('subscriptions').select('id', count='exact').eq('status', 'active').execute()
            stats['active_subscriptions'] = subs_result.count if hasattr(subs_result, 'count') else 0

            # Total predictions
            preds_result = self.supabase.table('predictions').select('id', count='exact').execute()
            stats['total_predictions'] = preds_result.count if hasattr(preds_result, 'count') else 0

            # Total uploads
            uploads_result = self.supabase.table('uploads').select('id', count='exact').execute()
            stats['total_uploads'] = uploads_result.count if hasattr(uploads_result, 'count') else 0

            # Total recommendations
            recs_result = self.supabase.table('recommendations').select('id', count='exact').execute()
            stats['total_recommendations'] = recs_result.count if hasattr(recs_result, 'count') else 0

            # Average confidence - need to calculate manually
            all_preds = self.supabase.table('predictions').select('confidence').execute()
            if all_preds.data:
                confidences = [float(p['confidence']) for p in all_preds.data if p.get('confidence') is not None]
                stats['avg_confidence'] = (sum(confidences) / len(confidences)) if confidences else 0.0
            else:
                stats['avg_confidence'] = 0.0

            # Subscription breakdown
            users = self.supabase.table('users').select('subscription_tier').execute()
            breakdown = {}
            if users.data:
                for user in users.data:
                    tier = user.get('subscription_tier', 'free')
                    breakdown[tier] = breakdown.get(tier, 0) + 1
            stats['subscription_breakdown'] = breakdown

            return stats
        except Exception as e:
            print(f"Error getting admin stats: {e}")
            return {}

    # ========================================================================
    # AUDIT LOGS
    # ========================================================================
    def create_audit_log(self, user_id: Optional[str], action: str,
                         details: Optional[Dict] = None, ip_address: Optional[str] = None,
                         user_agent: Optional[str] = None) -> bool:
        """Create audit log entry"""
        try:
            payload = {
                'user_id': user_id,
                'action': action,
                'details': details,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'created_at': self._now_iso()
            }
            self.supabase.table('audit_logs').insert(payload).execute()
            return True
        except Exception as e:
            print(f"Error creating audit log: {e}")
            return False
