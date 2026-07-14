import os
import mimetypes
import requests

SUPABASE_URL = "https://nkowcjmjqaszwtrvgedt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rb3djam1qcWFzend0cnZnZWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwOTk3MTMsImV4cCI6MjA3NTY3NTcxM30.y3wgX9ndQFrplUT8A7C0unZbe6E-H1Ygz1hpiJW2am4"
BUCKET_NAME = "make-a8898ff1-images"

images_dir = "/Users/kimseunghyun/Documents/seoulmetro/docs/law/output/images"

def upload_all_images():
    if not os.path.exists(images_dir):
        print(f"Error: Directory '{images_dir}' does not exist.")
        return

    print(f"Starting upload from {images_dir} to Supabase bucket '{BUCKET_NAME}'...")
    success_count = 0
    fail_count = 0

    for root, dirs, files in os.walk(images_dir):
        for file in files:
            # Skip hidden files
            if file.startswith("."):
                continue
                
            filepath = os.path.join(root, file)
            # Find the path relative to output/images/
            # This will be like: "1. 운전취급규정(24.12.03)/jidopyo_front.png"
            relpath = os.path.relpath(filepath, images_dir)
            
            # Construct target storage path in bucket
            storage_path = f"images/{relpath}"
            
            # Detect mime type
            mime_type, _ = mimetypes.guess_type(filepath)
            if not mime_type:
                mime_type = "application/octet-stream"
                
            print(f"Uploading {relpath} ({mime_type}) -> {storage_path}...")
            
            url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/{storage_path}"
            headers = {
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "apikey": SUPABASE_KEY,
                "x-upsert": "true",
                "Content-Type": mime_type
            }
            
            try:
                with open(filepath, "rb") as f:
                    data = f.read()
                    
                response = requests.post(url, headers=headers, data=data)
                if response.status_code == 200:
                    print("  ✅ Uploaded successfully!")
                    success_count += 1
                else:
                    print(f"  ❌ Failed! Status: {response.status_code}, Response: {response.text}")
                    fail_count += 1
            except Exception as e:
                print(f"  ❌ Error uploading: {e}")
                fail_count += 1

    print(f"\nUpload Finished! Success: {success_count}, Failed: {fail_count}")

if __name__ == "__main__":
    upload_all_images()
