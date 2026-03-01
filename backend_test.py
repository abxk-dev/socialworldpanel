import requests
import sys
import json
from datetime import datetime

class SMMPanelAPITester:
    def __init__(self, base_url="https://smm-panel-build.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, use_admin=False):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        # Use admin token if specified and available
        if use_admin and self.admin_token:
            headers['Authorization'] = f'Bearer {self.admin_token}'
        elif self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.text else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    'name': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:500]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                'name': name,
                'error': str(e)
            })
            return False, {}

    def test_public_stats(self):
        """Test public stats endpoint"""
        return self.run_test("Public Stats", "GET", "public/stats", 200)

    def test_public_categories(self):
        """Test public categories endpoint"""
        return self.run_test("Public Categories", "GET", "public/categories", 200)

    def test_public_services(self):
        """Test public services endpoint"""
        return self.run_test("Public Services", "GET", "public/services", 200)

    def test_admin_login(self, email="admin@kalia.com", password="Hanumanji22@"):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST", 
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   Admin token stored: {self.admin_token[:20]}...")
            return True
        return False

    def test_user_registration(self, username="testuser", email="test@example.com", password="TestPass123!"):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register", 
            200,
            data={"name": username, "email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   User token stored: {self.token[:20]}...")
            return True
        return False

    def test_user_login(self, email="test@example.com", password="TestPass123!"):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            return True
        return False

    def test_get_me(self):
        """Test get current user"""
        return self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_user_stats(self):
        """Test user stats"""
        return self.run_test("User Stats", "GET", "user/stats", 200)

    def test_get_services(self):
        """Test get services"""
        return self.run_test("Get Services", "GET", "services", 200)

    def test_get_categories(self):
        """Test get service categories"""
        return self.run_test("Get Categories", "GET", "services/categories", 200)

    def test_create_order(self):
        """Test creating an order"""
        # First get a service
        success, services = self.run_test("Get Services for Order", "GET", "services", 200)
        if not success or not services:
            return False

        # Use the first service
        service = services[0]
        order_data = {
            "service_id": service["service_id"], 
            "link": "https://instagram.com/test_user",
            "quantity": service.get("min_order", 100)
        }
        
        return self.run_test("Create Order", "POST", "orders", 201, data=order_data)

    def test_get_orders(self):
        """Test get user orders"""
        return self.run_test("Get Orders", "GET", "orders", 200)

    def test_create_deposit(self):
        """Test creating a deposit"""
        deposit_data = {"amount": 10.0, "method": "paytm"}
        return self.run_test("Create Deposit", "POST", "deposits", 200, data=deposit_data)

    def test_get_deposits(self):
        """Test get user deposits"""  
        return self.run_test("Get Deposits", "GET", "deposits", 200)

    def test_create_ticket(self):
        """Test creating a support ticket"""
        ticket_data = {"subject": "Test Ticket", "message": "This is a test ticket"}
        return self.run_test("Create Ticket", "POST", "tickets", 200, data=ticket_data)

    def test_get_tickets(self):
        """Test get user tickets"""
        return self.run_test("Get Tickets", "GET", "tickets", 200)

    def test_get_api_key(self):
        """Test get user API key"""
        return self.run_test("Get API Key", "GET", "user/api-key", 200)

    def test_admin_dashboard(self):
        """Test admin dashboard"""
        return self.run_test("Admin Dashboard", "GET", "admin/dashboard", 200, use_admin=True)

    def test_admin_users(self):
        """Test admin users listing"""
        return self.run_test("Admin Users", "GET", "admin/users", 200, use_admin=True)

    def test_admin_orders(self):
        """Test admin orders listing"""  
        return self.run_test("Admin Orders", "GET", "admin/orders", 200, use_admin=True)

def main():
    print("🚀 Starting Social World Panel API Tests...")
    print("="*60)
    
    tester = SMMPanelAPITester()
    timestamp = datetime.now().strftime('%H%M%S')
    
    # Test public endpoints first
    print("\n📊 Testing Public Endpoints...")
    tester.test_public_stats()
    tester.test_public_categories() 
    tester.test_public_services()
    
    # Test admin authentication
    print(f"\n🔐 Testing Admin Authentication...")
    if not tester.test_admin_login():
        print("❌ Admin login failed - stopping admin tests")
    else:
        print("\n👑 Testing Admin Endpoints...")
        tester.test_admin_dashboard()
        tester.test_admin_users()
        tester.test_admin_orders()
    
    # Test user authentication
    print(f"\n👤 Testing User Authentication...")
    test_email = f"test_{timestamp}@example.com"
    if not tester.test_user_registration("Test User", test_email, "TestPass123!"):
        print("❌ User registration failed - trying login")
        if not tester.test_user_login(test_email, "TestPass123!"):
            print("❌ User authentication completely failed")
            return 1
    
    # Test authenticated user endpoints
    print(f"\n🔍 Testing User Endpoints...")
    tester.test_get_me()
    tester.test_user_stats()
    tester.test_get_services()
    tester.test_get_categories()
    tester.test_get_orders()
    tester.test_get_deposits()
    tester.test_get_tickets()
    tester.test_get_api_key()
    
    # Test order creation (needs balance)
    print(f"\n💰 Testing Order Flow...")
    tester.test_create_deposit()  # Add funds first
    tester.test_create_order()
    tester.test_get_orders()  # Check orders after creation
    
    # Test support
    print(f"\n🎫 Testing Support...")
    tester.test_create_ticket()
    tester.test_get_tickets()
    
    # Print results
    print("\n" + "="*60)
    print(f"📊 TEST RESULTS:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Tests Failed: {len(tester.failed_tests)}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.failed_tests:
        print(f"\n❌ FAILED TESTS:")
        for failed in tester.failed_tests:
            print(f"   - {failed['name']}")
            if 'error' in failed:
                print(f"     Error: {failed['error']}")
            else:
                print(f"     Expected: {failed['expected']}, Got: {failed['actual']}")
    
    return 0 if len(tester.failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())