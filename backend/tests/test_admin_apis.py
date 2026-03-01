"""
Admin Dashboard, Providers, Bonuses, and Reports API Tests
Tests Phase 1 features: Dashboard charts, Providers management, Bonus tiers/promotions, Revenue reports
"""

import pytest
import requests
import os
import uuid

# Use environment variable for backend URL
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@kalia.com"
ADMIN_PASSWORD = "Hanumanji22@"


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_health_endpoint(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ Health check passed: {data}")


class TestAdminAuthentication:
    """Admin login tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✓ Admin login successful: role={data['user']['role']}")
        return data["access_token"]
    
    def test_admin_login_invalid_password(self):
        """Test admin login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid password correctly rejected")


@pytest.fixture(scope="module")
def admin_token():
    """Get admin token for authenticated tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Admin authentication failed")


@pytest.fixture
def admin_headers(admin_token):
    """Get admin auth headers"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestAdminDashboard:
    """Admin Dashboard API tests - charts and stats"""
    
    def test_get_dashboard_data(self, admin_headers):
        """Test admin dashboard endpoint returns stats"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields exist
        required_fields = [
            "total_users", "new_users_today", "total_orders", 
            "pending_orders", "revenue_today", "revenue_total",
            "total_profit", "active_providers"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Dashboard data retrieved: users={data['total_users']}, revenue=${data['revenue_total']}")
    
    def test_get_dashboard_charts(self, admin_headers):
        """Test admin dashboard charts endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/charts", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify chart data fields
        assert "revenue_by_day" in data, "Missing revenue_by_day"
        assert "users_by_day" in data, "Missing users_by_day"
        assert "top_services" in data, "Missing top_services"
        assert "orders_by_status" in data, "Missing orders_by_status"
        assert "revenue_by_method" in data, "Missing revenue_by_method"
        
        # Verify revenue_by_day has 30 days of data
        assert len(data["revenue_by_day"]) == 30, "Should have 30 days of revenue data"
        
        # Check structure of revenue day data
        if data["revenue_by_day"]:
            day_data = data["revenue_by_day"][0]
            assert "date" in day_data
            assert "revenue" in day_data
            assert "profit" in day_data
            assert "orders" in day_data
        
        print(f"✓ Charts data retrieved: {len(data['revenue_by_day'])} days of revenue, {len(data['orders_by_status'])} statuses")


class TestAdminProviders:
    """Admin Providers API tests - CRUD and actions"""
    
    def test_get_providers_list(self, admin_headers):
        """Test fetching providers list"""
        response = requests.get(f"{BASE_URL}/api/admin/providers", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Check if mock provider is seeded
        mock_providers = [p for p in data if p.get("is_mock") == True]
        assert len(mock_providers) >= 1, "Should have at least one mock provider seeded"
        
        print(f"✓ Providers list retrieved: {len(data)} providers")
        return data
    
    def test_provider_test_connection(self, admin_headers):
        """Test provider connection test endpoint"""
        # First get providers
        providers_response = requests.get(f"{BASE_URL}/api/admin/providers", headers=admin_headers)
        providers = providers_response.json()
        
        if not providers:
            pytest.skip("No providers to test")
        
        provider = providers[0]
        response = requests.post(
            f"{BASE_URL}/api/admin/providers/{provider['provider_id']}/test",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have success flag and ping
        assert "success" in data
        assert "ping" in data
        
        if data["success"]:
            assert "balance" in data
            print(f"✓ Provider test connection successful: balance=${data.get('balance')}, ping={data['ping']}ms")
        else:
            print(f"✓ Provider test connection returned (expected for mock): {data.get('error')}")
    
    def test_provider_refresh_balance(self, admin_headers):
        """Test refresh provider balance endpoint"""
        # Get providers first
        providers_response = requests.get(f"{BASE_URL}/api/admin/providers", headers=admin_headers)
        providers = providers_response.json()
        
        if not providers:
            pytest.skip("No providers to test")
        
        provider = providers[0]
        response = requests.post(
            f"{BASE_URL}/api/admin/providers/{provider['provider_id']}/refresh-balance",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should return balance or error
        assert "balance" in data or "error" in data
        print(f"✓ Refresh balance response: {data}")
    
    def test_provider_get_services(self, admin_headers):
        """Test fetching services from provider"""
        providers_response = requests.get(f"{BASE_URL}/api/admin/providers", headers=admin_headers)
        providers = providers_response.json()
        
        if not providers:
            pytest.skip("No providers to test")
        
        provider = providers[0]
        response = requests.get(
            f"{BASE_URL}/api/admin/providers/{provider['provider_id']}/services",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have services list
        assert "services" in data
        assert isinstance(data["services"], list)
        print(f"✓ Provider services retrieved: {len(data['services'])} services")
    
    def test_provider_get_logs(self, admin_headers):
        """Test fetching provider activity logs"""
        providers_response = requests.get(f"{BASE_URL}/api/admin/providers", headers=admin_headers)
        providers = providers_response.json()
        
        if not providers:
            pytest.skip("No providers to test")
        
        provider = providers[0]
        response = requests.get(
            f"{BASE_URL}/api/admin/providers/{provider['provider_id']}/logs?limit=10",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Provider logs retrieved: {len(data)} logs")


class TestAdminBonuses:
    """Admin Bonus Management API tests"""
    
    def test_get_bonus_tiers(self, admin_headers):
        """Test fetching bonus tiers"""
        response = requests.get(f"{BASE_URL}/api/admin/bonus/tiers", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Should have 5 seeded tiers
        assert len(data) >= 5, "Should have at least 5 bonus tiers seeded"
        
        # Verify tier structure
        if data:
            tier = data[0]
            assert "tier_id" in tier
            assert "min_amount" in tier
            assert "max_amount" in tier
            assert "bonus_percent" in tier
            assert "is_active" in tier
        
        print(f"✓ Bonus tiers retrieved: {len(data)} tiers")
        
        # Verify tiered percentages as per requirements
        # $10-49=3%, $50-99=5%, $100-199=8%, $200-499=10%, $500+=15%
        for tier in data:
            if tier["min_amount"] == 10:
                assert tier["bonus_percent"] == 3, "Tier $10-49 should be 3%"
            elif tier["min_amount"] == 50:
                assert tier["bonus_percent"] == 5, "Tier $50-99 should be 5%"
            elif tier["min_amount"] == 100:
                assert tier["bonus_percent"] == 8, "Tier $100-199 should be 8%"
            elif tier["min_amount"] == 200:
                assert tier["bonus_percent"] == 10, "Tier $200-499 should be 10%"
            elif tier["min_amount"] == 500:
                assert tier["bonus_percent"] == 15, "Tier $500+ should be 15%"
        print("✓ Bonus tier percentages verified")
    
    def test_get_bonus_settings(self, admin_headers):
        """Test fetching bonus settings"""
        response = requests.get(f"{BASE_URL}/api/admin/bonus/settings", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify settings structure
        assert "enabled" in data
        assert "first_deposit_bonus" in data
        print(f"✓ Bonus settings retrieved: enabled={data['enabled']}, first_deposit={data['first_deposit_bonus']}")
    
    def test_update_bonus_settings(self, admin_headers):
        """Test updating bonus settings"""
        new_settings = {
            "enabled": True,
            "first_deposit_bonus": True,
            "first_deposit_percent": 10,
            "first_deposit_min": 10
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/bonus/settings",
            headers=admin_headers,
            json=new_settings
        )
        assert response.status_code == 200
        print("✓ Bonus settings updated successfully")
    
    def test_get_bonus_promotions(self, admin_headers):
        """Test fetching bonus promotions"""
        response = requests.get(f"{BASE_URL}/api/admin/bonus/promotions", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Bonus promotions retrieved: {len(data)} promotions")
    
    def test_create_bonus_promotion(self, admin_headers):
        """Test creating a new bonus promotion"""
        from datetime import datetime, timedelta
        
        start_date = datetime.utcnow().isoformat() + "Z"
        end_date = (datetime.utcnow() + timedelta(days=7)).isoformat() + "Z"
        
        promo_data = {
            "title": f"TEST_Promotion_{uuid.uuid4().hex[:8]}",
            "bonus_percent": 20,
            "min_deposit": 50,
            "max_bonus": 100,
            "start_date": start_date,
            "end_date": end_date,
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/bonus/promotions",
            headers=admin_headers,
            json=promo_data
        )
        assert response.status_code == 200
        data = response.json()
        assert "promo_id" in data
        print(f"✓ Promotion created: {data['promo_id']}")
        return data["promo_id"]


class TestAdminReports:
    """Admin Reports API tests - Revenue, Profit, Orders, Payments"""
    
    def test_get_revenue_report(self, admin_headers):
        """Test revenue report endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/reports/revenue", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "period" in data
        assert "summary" in data
        assert "by_day" in data
        
        # Verify summary fields
        summary = data["summary"]
        assert "total_revenue" in summary
        assert "total_cost" in summary
        assert "total_profit" in summary
        assert "profit_margin" in summary
        assert "total_orders" in summary
        
        print(f"✓ Revenue report: revenue=${summary['total_revenue']}, profit=${summary['total_profit']}")
    
    def test_get_revenue_report_with_dates(self, admin_headers):
        """Test revenue report with date range filter"""
        from datetime import datetime, timedelta
        
        end_date = datetime.utcnow().isoformat() + "Z"
        start_date = (datetime.utcnow() - timedelta(days=7)).isoformat() + "Z"
        
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/revenue?start_date={start_date}&end_date={end_date}",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "period" in data
        print(f"✓ Revenue report with date filter works")
    
    def test_export_revenue_csv(self, admin_headers):
        """Test revenue CSV export endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/revenue/export",
            headers=admin_headers
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        assert len(response.content) > 0
        print("✓ Revenue CSV export works")
    
    def test_get_profit_report(self, admin_headers):
        """Test profit report endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/reports/profit", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data
        summary = data["summary"]
        assert "gross_revenue" in summary
        assert "provider_costs" in summary
        assert "net_profit" in summary
        assert "profit_margin" in summary
        
        print(f"✓ Profit report: gross=${summary['gross_revenue']}, net=${summary['net_profit']}")
    
    def test_get_orders_report(self, admin_headers):
        """Test orders report endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/reports/orders", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data
        assert "total_orders" in data["summary"]
        assert "by_status" in data["summary"]
        
        print(f"✓ Orders report: total={data['summary']['total_orders']}")
    
    def test_get_payments_report(self, admin_headers):
        """Test payments report endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/reports/payments", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data
        summary = data["summary"]
        assert "total_deposits" in summary
        assert "total_amount" in summary
        assert "total_bonus" in summary
        
        print(f"✓ Payments report: deposits={summary['total_deposits']}, amount=${summary['total_amount']}")


class TestUserRegistrationFlow:
    """Test user registration still works"""
    
    def test_user_registration(self):
        """Test new user registration"""
        test_email = f"test_user_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test User",
            "email": test_email,
            "password": "TestPassword123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == test_email
        assert data["user"]["role"] == "user"
        print(f"✓ User registration successful: {test_email}")
        return data["access_token"]


class TestUserOrderFlow:
    """Test user can place orders"""
    
    @pytest.fixture
    def user_token(self):
        """Create a test user and get token"""
        test_email = f"order_test_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Order Test User",
            "email": test_email,
            "password": "TestPassword123!"
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("User registration failed")
    
    def test_get_services_for_order(self, user_token):
        """Test fetching available services"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{BASE_URL}/api/services", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Services endpoint returns list directly
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ Services fetched: {len(data)} available")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
