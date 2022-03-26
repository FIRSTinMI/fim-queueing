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

KEY_CHARACTERS = string.ascii_uppercase + string.digits
for confusing_char in ['O', 'I', 0, 1]:
	KEY_CHARACTERS.remove(confusing_char);

if len(sys.argv) != 5:
	print('Usage: python3 init_event.py "/path/to/your/firebase-certificate" "frcApiUser:whatever-your-token-is" 2022 FIM')
	return 1
	
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

for event in events:
    key = ''.join(random.choice(KEY_CHARACTERS) for _ in range(10))
    ref = db.reference('events/'+sys.argv[3]+'/' + key)
    ref.set({
        'name': event['name'],
        'start': event['dateStart'],
        'end': event['dateEnd'],
        'eventCode': event['code'],
        'matches': []
    })
