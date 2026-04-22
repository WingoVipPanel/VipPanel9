import asyncio
import os
import json
from telethon import TelegramClient, events
import firebase_admin
from firebase_admin import credentials, firestore

# ==========================================
# STEP 1: CONSTANTS & CREDENTIALS
# ==========================================
# Get these from https://my.telegram.org/apps
API_ID = 12345678  # REPLACE WITH YOUR API_ID (Integer)
API_HASH = 'your_api_hash_here' # REPLACE WITH YOUR API_HASH (String)

# The telegram bot or channel you want to scrape from
TARGET_BOT_USERNAME = '@ColorPredictorBot' # REPLACE WITH THE BOT/CHANNEL USERNAME

# ==========================================
# STEP 2: FIREBASE SETUP
# ==========================================
# 1. Go to Firebase Console -> Project Settings -> Service Accounts
# 2. Click "Generate New Private Key"
# 3. Save the downloaded JSON file as 'firebase-key.json' in this folder
try:
    cred = credentials.Certificate("firebase-key.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Firebase Connected Successfully!")
except Exception as e:
    print("❌ Firebase Connection Error: Make sure 'firebase-key.json' is in the folder.")
    print("Error Details:", e)
    exit(1)


# ==========================================
# STEP 3: TELEGRAM CLIENT SETUP
# ==========================================
# The 'session_name' will create a file to save your login session so you don't have to login every time.
client = TelegramClient('scraper_session', API_ID, API_HASH)

@client.on(events.NewMessage(chats=TARGET_BOT_USERNAME))
async def handler(event):
    message_text = event.message.message
    print(f"📩 New Message from bot: {message_text}")
    
    # Optional: You can filter the message here to only upload what you need
    # if "win" in message_text.lower() or "red" in message_text.lower():
    
    try:
        # Save to Firebase Firestore Database
        doc_ref = db.collection('live_predictions').document()
        doc_ref.set({
            'text': message_text,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'source': TARGET_BOT_USERNAME
        })
        print(f"✅ Saved to Firebase Website Database!")
    except Exception as e:
        print(f"❌ Failed to save to database: {e}")

async def main():
    print(f"🚀 Starting Telegram Scraper... Listening to {TARGET_BOT_USERNAME}")
    # This will keep the script running and listening for new messages forever
    await client.run_until_disconnected()

if __name__ == '__main__':
    with client:
        client.loop.run_until_complete(main())
