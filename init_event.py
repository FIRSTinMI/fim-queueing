# Import database module.
from firebase_admin import db, initialize_app, credentials, auth
from base64 import b64encode
import requests
import string
import random

KEY_CHARACTERS = string.ascii_lowercase + string.ascii_uppercase + string.digits

cred_obj = credentials.Certificate('REDACTED')
default_app = initialize_app(cred_obj, {
	'databaseURL': 'REDACTED'
	})

token = b"REDACTED"
token = b64encode(token)

matches_url = "https://frc-api.firstinspires.org/v3.0/"+"2022"+"/events/?districtCode=FIM"

req = requests.get(matches_url, headers={'Authorization': 'Basic ' + token.decode()})

if (not req.ok):
    print("Error getting events")
    print(req.text)

events = req.json()["Events"]

for event in events:
    key = ''.join(random.choice(KEY_CHARACTERS) for _ in range(10))
    ref = db.reference('events/2022/' + key)
    ref.set({
        'name': event['name'],
        'start': event['dateStart'],
        'end': event['dateEnd'],
        'eventCode': event['code'],
        'qualMatches': []
    })


# Get a database reference to our posts
#ref = db.reference('events/2022/testGULkey')

# Read the data at the posts reference (this is a blocking operation)
#ref.set({
#    'season': 2022,
#    'name': 'Gull Lake'
#})