import {
  CallingState,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
  // useCall,
  useCallStateHooks,
} from '@stream-io/video-react-sdk';
import { StreamTheme } from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import { ParticipantView } from '@stream-io/video-react-sdk';
import { memo } from 'react';
import {
  ToggleAudioPublishingButton,
  ToggleVideoPublishingButton,
} from '@stream-io/video-react-sdk';

const apiKey = 'mmhfdzb5evj2';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3Byb250by5nZXRzdHJlYW0uaW8iLCJzdWIiOiJ1c2VyL0RhcnRoX1ZhZGVyIiwidXNlcl9pZCI6IkRhcnRoX1ZhZGVyIiwidmFsaWRpdHlfaW5fc2Vjb25kcyI6NjA0ODAwLCJpYXQiOjE3NDIwMzY3NjcsImV4cCI6MTc0MjY0MTU2N30.s_TNCpU9PnBY5-flj7gSbk002ZafJhl_5vR9rabguTM';

export default memo(function VideoCall({ roomID, username }) {
  const userId = 'Darth_Vader';
  const callId = roomID;

  // Set up the user object
  const user = {
    id: userId,
    name: 'Oliver',
    image: 'https://getstream.io/random_svg/?id=oliver&name=Oliver',
  };

  const client = new StreamVideoClient({ apiKey, user, token });
  const call = client.call('default', callId);
  call.join({ create: true });

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <MyUILayout />
      </StreamCall>
    </StreamVideo>
  );
});

export const MyUILayout = () => {
  const {
    useCallCallingState,
    useLocalParticipant,
    useRemoteParticipants,
    // ... other hooks
  } = useCallStateHooks();

  const callingState = useCallCallingState();
  const localParticipant = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();

  if (callingState !== CallingState.JOINED) {
    return <div>Loading...</div>;
  }

  // Combine local and remote participants
  const allParticipants = [localParticipant, ...remoteParticipants];

  return (
    <StreamTheme>
      <MyParticipantList participants={allParticipants} />
    </StreamTheme>
  );
};

export const MyParticipantList = memo((props) => {
  const { participants } = props;

  // Filter out duplicates based on sessionId
  const uniqueParticipants = [...new Map(participants.map(item => [item.sessionId, item])).values()];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column', // Change from 'row' to 'column'
      gap: '8px',
      alignItems: 'center', // Optional: Centers the participants horizontally
    }}>
      {uniqueParticipants.map((participant) => (
        <div key={participant.sessionId}>
          <ParticipantView participant={participant} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <ToggleVideoPublishingButton participant={participant} />
            <ToggleAudioPublishingButton participant={participant} />
          </div>
        </div>
      ))}
    </div>
  );
});