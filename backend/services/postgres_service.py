"""
PostgreSQL Database Service for ZeaWatch
Handles all database operations using psycopg2
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor, Json
from psycopg2.pool import SimpleConnectionPool
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import uuid
from contextlib import contextmanager


class PostgresService:
    """PostgreSQL database service with connection pooling"""
    
    def __init__(self):
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': os.getenv('DB_PORT', '5432'),
            'database': os.getenv('DB_NAME', 'zeawatch'),
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', 'postgres')
        }
        self.pool = None
        self._init_pool()
    
    def _init_pool(self):
        """Initialize connection pool"""
        try:
            self.pool = SimpleConnectionPool(
                minconn=1,
                maxconn=10,
                **self.db_config
            )
            if self.pool:
                print("✅ Database connection pool created successfully")
        except Exception as e:
            print(f"❌ Error creating connection pool: {e}")
            self.pool = None
    
    @contextmanager
    def get_connection(self):
        """Get a database connection from the pool"""
        conn = None
        try:
            if self.pool:
                conn = self.pool.getconn()
                yield conn
            else:
                raise Exception("Database connection pool not initialized")
        finally:
            if conn:
                self.pool.putconn(conn)
    
    # ============================================================================
    # USER OPERATIONS
    # ============================================================================
    
    def create_user(self, name: str, email: str, password_hash: str, 
                   preferred_language: str = 'en', role: str = 'user') -> Optional[Dict]:
        """Create a new user"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                try:
                    user_id = uuid.uuid4()
                    cur.execute("""
                        INSERT INTO users (id, name, email, password_hash, preferred_language, role)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        RETURNING *
                    """, (user_id, name, email, password_hash, preferred_language, role))
                    result = cur.fetchone()
                    conn.commit()
                    return dict(result) if result else None
                except psycopg2.IntegrityError as e:
                    conn.rollback()
                    if 'email' in str(e):
                        raise ValueError("Email already exists")
                    raise
                except Exception as e:
                    conn.rollback()
                    raise
    
    def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM users WHERE email = %s", (email,))
                result = cur.fetchone()
                return dict(result) if result else None
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Get user by ID"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
                result = cur.fetchone()
                return dict(result) if result else None
    
    def update_user(self, user_id: str, **kwargs) -> Optional[Dict]:
        """Update user fields"""
        allowed_fields = ['name', 'preferred_language', 'verified', 'last_login', 
                         'subscription_tier', 'payment_customer_id', 'password_hash']
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
        
        if not updates:
            return None
        
        # Handle updated_at separately
        set_clause = ', '.join([f"{k} = %s" for k in updates.keys()])
        set_clause += ', updated_at = NOW()'
        values = list(updates.values()) + [user_id]
        
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(f"""
                    UPDATE users 
                    SET {set_clause}
                    WHERE id = %s
                    RETURNING *
                """, values)
                result = cur.fetchone()
                conn.commit()
                return dict(result) if result else None
    
    # ============================================================================
    # EMAIL VERIFICATION
    # ============================================================================
    
    def create_verification_token(self, user_id: str, token: str, 
                                  expires_in_hours: int = 24) -> bool:
        """Create email verification token"""
        expires_at = datetime.utcnow() + timedelta(hours=expires_in_hours)
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                try:
                    cur.execute("""
                        INSERT INTO email_verification_tokens (user_id, token, expires_at)
                        VALUES (%s, %s, %s)
                    """, (user_id, token, expires_at))
                    conn.commit()
                    return True
                except Exception as e:
                    conn.rollback()
                    print(f"Error creating verification token: {e}")
                    return False
    
    def verify_token(self, token: str) -> Optional[str]:
        """Verify token and return user_id if valid"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT user_id FROM email_verification_tokens
                    WHERE token = %s AND expires_at > NOW()
                """, (token,))
                result = cur.fetchone()
                if result:
                    user_id = result['user_id']
                    # Delete token after use
                    cur.execute("DELETE FROM email_verification_tokens WHERE token = %s", (token,))
                    conn.commit()
                    return str(user_id)
                return None
    
    # ============================================================================
    # PASSWORD RESET
    # ============================================================================
    
    def create_password_reset_token(self, user_id: str, token: str,
                                   expires_in_hours: int = 1) -> bool:
        """Create password reset token"""
        expires_at = datetime.utcnow() + timedelta(hours=expires_in_hours)
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                try:
                    cur.execute("""
                        INSERT INTO password_reset_tokens (user_id, token, expires_at)
                        VALUES (%s, %s, %s)
                    """, (user_id, token, expires_at))
                    conn.commit()
                    return True
                except Exception as e:
                    conn.rollback()
                    return False
    
    def verify_password_reset_token(self, token: str) -> Optional[str]:
        """Verify password reset token"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT user_id FROM password_reset_tokens
                    WHERE token = %s AND expires_at > NOW() AND used = false
                """, (token,))
                result = cur.fetchone()
                if result:
                    return str(result['user_id'])
                return None
    
    def mark_password_reset_token_used(self, token: str) -> bool:
        """Mark password reset token as used"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE password_reset_tokens
                    SET used = true
                    WHERE token = %s
                """, (token,))
                conn.commit()
                return cur.rowcount > 0
    
    # ============================================================================
    # PREDICTIONS
    # ============================================================================
    
    def save_prediction(self, user_id: Optional[str], image_url: Optional[str],
                       label: str, confidence: float, raw_scores: Dict,
                       model_version: str, description: Optional[str] = None,
                       recommendation: Optional[str] = None,
                       latitude: Optional[float] = None,
                       longitude: Optional[float] = None,
                       field_name: Optional[str] = None) -> Dict:
        """Save prediction with normalized confidence"""
        # Ensure confidence is in [0, 1]
        confidence = max(0.0, min(1.0, float(confidence)))
        
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    INSERT INTO predictions 
                    (user_id, image_url, label, confidence, raw_scores, model_version,
                     description, recommendation, latitude, longitude, field_name)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                """, (user_id, image_url, label, confidence, Json(raw_scores), 
                     model_version, description, recommendation, latitude, longitude, field_name))
                result = cur.fetchone()
                conn.commit()
                return dict(result) if result else {}
    
    def get_user_predictions(self, user_id: str, limit: int = 100, 
                            offset: int = 0) -> List[Dict]:
        """Get predictions for a user"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT * FROM predictions
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                """, (user_id, limit, offset))
                return [dict(row) for row in cur.fetchall()]
    
    def get_all_predictions(self, limit: int = 100, offset: int = 0,
                           filters: Optional[Dict] = None) -> List[Dict]:
        """Get all predictions (admin)"""
        query = "SELECT * FROM predictions WHERE 1=1"
        params = []
        
        if filters:
            if filters.get('user_id'):
                query += " AND user_id = %s"
                params.append(filters['user_id'])
            if filters.get('label'):
                query += " AND label ILIKE %s"
                params.append(f"%{filters['label']}%")
        
        query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                return [dict(row) for row in cur.fetchall()]
    
    # ============================================================================
    # SUBSCRIPTIONS
    # ============================================================================
    
    def create_subscription(self, user_id: str, tier: str, provider: str,
                           provider_subscription_id: Optional[str] = None,
                           expires_at: Optional[datetime] = None) -> Dict:
        """Create a subscription"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    INSERT INTO subscriptions 
                    (user_id, tier, status, provider, provider_subscription_id, expires_at)
                    VALUES (%s, %s, 'active', %s, %s, %s)
                    RETURNING *
                """, (user_id, tier, provider, provider_subscription_id, expires_at))
                result = cur.fetchone()
                
                # Update user subscription tier
                cur.execute("""
                    UPDATE users SET subscription_tier = %s WHERE id = %s
                """, (tier, user_id))
                
                conn.commit()
                return dict(result) if result else {}
    
    def update_subscription_status(self, subscription_id: str, status: str) -> bool:
        """Update subscription status"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE subscriptions
                    SET status = %s, updated_at = NOW()
                    WHERE id = %s
                """, (status, subscription_id))
                conn.commit()
                return cur.rowcount > 0
    
    def get_user_subscription(self, user_id: str) -> Optional[Dict]:
        """Get active subscription for user"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT * FROM subscriptions
                    WHERE user_id = %s AND status = 'active'
                    ORDER BY created_at DESC
                    LIMIT 1
                """, (user_id,))
                result = cur.fetchone()
                return dict(result) if result else None
    
    # ============================================================================
    # ADMIN OPERATIONS
    # ============================================================================
    
    def get_all_users(self, limit: int = 100, offset: int = 0,
                     filters: Optional[Dict] = None) -> List[Dict]:
        """Get all users (admin)"""
        query = "SELECT id, name, email, role, verified, preferred_language, subscription_tier, created_at, last_login FROM users WHERE 1=1"
        params = []
        
        if filters:
            if filters.get('email'):
                query += " AND email ILIKE %s"
                params.append(f"%{filters['email']}%")
            if filters.get('verified') is not None:
                query += " AND verified = %s"
                params.append(filters['verified'])
            if filters.get('subscription_tier'):
                query += " AND subscription_tier = %s"
                params.append(filters['subscription_tier'])
        
        query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                return [dict(row) for row in cur.fetchall()]
    
    def get_admin_stats(self) -> Dict:
        """Get admin statistics"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                stats = {}
                
                # Total users
                cur.execute("SELECT COUNT(*) as count FROM users")
                stats['total_users'] = cur.fetchone()['count']
                
                # Verified users
                cur.execute("SELECT COUNT(*) as count FROM users WHERE verified = true")
                stats['verified_users'] = cur.fetchone()['count']
                
                # Active subscriptions
                cur.execute("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'")
                stats['active_subscriptions'] = cur.fetchone()['count']
                
                # Total predictions
                cur.execute("SELECT COUNT(*) as count FROM predictions")
                stats['total_predictions'] = cur.fetchone()['count']
                
                # Average confidence
                cur.execute("SELECT AVG(confidence) as avg FROM predictions")
                result = cur.fetchone()
                stats['avg_confidence'] = float(result['avg']) if result['avg'] else 0.0
                
                # Subscription breakdown
                cur.execute("""
                    SELECT subscription_tier, COUNT(*) as count
                    FROM users
                    GROUP BY subscription_tier
                """)
                stats['subscription_breakdown'] = {row['subscription_tier']: row['count'] 
                                                   for row in cur.fetchall()}
                
                return stats
    
    # ============================================================================
    # AUDIT LOGS
    # ============================================================================
    
    def create_audit_log(self, user_id: Optional[str], action: str,
                        details: Optional[Dict] = None, ip_address: Optional[str] = None,
                        user_agent: Optional[str] = None) -> bool:
        """Create audit log entry"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                try:
                    cur.execute("""
                        INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (user_id, action, Json(details) if details else None, 
                         ip_address, user_agent))
                    conn.commit()
                    return True
                except Exception as e:
                    conn.rollback()
                    print(f"Error creating audit log: {e}")
                    return False

