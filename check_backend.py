import requests
import time

def check_backend():
    max_attempts = 5
    attempt = 0
    
    while attempt < max_attempts:
        try:
            response = requests.get('http://localhost:8000/api/health', timeout=5)
            if response.status_code == 200:
                print("✅ Backend server is running and responding!")
                print(f"Response: {response.json()}")
                return True
            else:
                print(f"⚠️  Backend returned status code: {response.status_code}")
                print(f"Response: {response.text}")
        except requests.exceptions.ConnectionError:
            print(f"❌ Could not connect to backend (attempt {attempt + 1}/{max_attempts})...")
        except Exception as e:
            print(f"⚠️  An error occurred: {str(e)}")
        
        attempt += 1
        if attempt < max_attempts:
            print("Retrying in 3 seconds...")
            time.sleep(3)
    
    print("❌ Failed to connect to backend after multiple attempts.")
    return False

if __name__ == "__main__":
    check_backend()
