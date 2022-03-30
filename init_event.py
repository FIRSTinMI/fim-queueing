"""init_event.py: Generate the events for an FRC season in the fim-queueing database.

Example: python3 init_event.py "/path/to/your/firebase-certificate" "frcApiUser:whatever-your-token-is" 2022 FIM
"""

# Import database module.
from firebase_admin import db, initialize_app, credentials, auth
from base64 import b64encode
import requests
import string
import random
import sys
from datetime import datetime

KEY_CHARACTERS = string.ascii_uppercase + string.digits
for confusing_char in ['O', 'I', '0', '1']:
    KEY_CHARACTERS = KEY_CHARACTERS.replace(confusing_char, '');

if len(sys.argv) != 5:
    print('Usage: python3 init_event.py "/path/to/your/firebase-certificate" "frcApiUser:whatever-your-token-is" 2022 FIM')
    sys.exit(1)
    
cred_obj = credentials.Certificate(sys.argv[1])
default_app = initialize_app(cred_obj, {
    'databaseURL': 'https://fim-queueing-default-rtdb.firebaseio.com/'
})

token = sys.argv[2].encode()
token = b64encode(token)

matches_url = "https://frc-api.firstinspires.org/v3.0/"+sys.argv[3]+"/events/?districtCode="+sys.argv[4]

req = requests.get(matches_url, headers={'Authorization': 'Basic ' + token.decode()})

if (not req.ok):
    print("Error getting events")
    print(req.text)

events = req.json()["Events"]

existing_event_codes = db.reference('/seasons/'+sys.argv[3]+'/events').get()
existing_event_codes = [ x['eventCode'] for x in existing_event_codes.values() ]
epoch = datetime.utcfromtimestamp(0)

for event in events:
    if event['code'] in existing_event_codes:
        continue
    key = ''.join(random.choice(KEY_CHARACTERS) for _ in range(10))
    ref = db.reference('/seasons/'+sys.argv[3]+'/events/' + key)
    print(key+'\t'+event['code']+'\t'+event['name']+'\t'+event['dateStart'])
    ref.set({
        'name': event['name'],
        'start': event['dateStart'],
        'end': event['dateEnd'],
        'startMs': (datetime.fromisoformat(event['dateStart'])-epoch).total_seconds() * 1000,
        'endMs': (datetime.fromisoformat(event['dateEnd'])-epoch).total_seconds() * 1000,
        'eventCode': event['code'],
        'hasQualSchedule': False
    })
