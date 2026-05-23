import time
import requests

url = "http://localhost:8000/api/jobs"
params = {
    "q": "software engineer",
    "max_jobs": 5
}

print("Testing first request (should trigger live scrape and save to DB)...")
start_time = time.time()
try:
    response = requests.get(url, params=params, timeout=150)
    duration = time.time() - start_time
    print(f"Status Code: {response.status_code}")
    print(f"Time taken: {duration:.2f} seconds")
    if response.status_code == 200:
        data = response.json()
        print(f"Source: {data.get('source')}")
        print(f"Total Results: {data.get('total_results')}")
        print(f"Jobs returned: {len(data.get('jobs', []))}")
        if data.get('jobs'):
            print(f"First job title: {data['jobs'][0].get('title')}")
            print(f"First job company: {data['jobs'][0].get('company')}")
    else:
        print(f"Error response: {response.text}")
except Exception as e:
    print(f"Request failed: {e}")

print("\nTesting second request (should hit DB cache)...")
start_time = time.time()
try:
    response = requests.get(url, params=params, timeout=10)
    duration = time.time() - start_time
    print(f"Status Code: {response.status_code}")
    print(f"Time taken: {duration:.2f} seconds")
    if response.status_code == 200:
        data = response.json()
        print(f"Source: {data.get('source')}")
        print(f"Total Results: {data.get('total_results')}")
        print(f"Jobs returned: {len(data.get('jobs', []))}")
    else:
        print(f"Error response: {response.text}")
except Exception as e:
    print(f"Request failed: {e}")
