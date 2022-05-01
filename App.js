import React, {useState, useEffect, useRef} from 'react';
import {StyleSheet} from 'react-native';
import {
  ViroARScene,
  ViroText,
  ViroARSceneNavigator,
  ViroTrackingStateConstants,
  ViroARPlaneSelector,
  Viro3DObject,
  ViroAmbientLight,
  ViroAnimatedImage,
  ViroSpotLight,
  ViroImage,
  Viro360Image,
  ViroVideo,
  ViroSound,
  ViroSpatialSound,
  ViroFlexView,
  ViroAnimations,
} from '@viro-community/react-viro';
import './UserAgent';
import {io} from 'socket.io-client';

import {asyncTimeout, sanitizeText} from './utils';
import BusinessCard from './BusinessCard';
import ProductShowcase from './ProductShowcase';

const testLikeData = {
  label: '{0:user} sent likes to the host',
  likeCount: 15,
  nickname: 'Maurice_chrisboemfamily',
  totalLikeCount: 73854,
  type: 'like',
  uniqueId: 'maurice_chrisboemfamily',
  text: 'sent likes x 10',
};

const testFollowData = {
  label: '{0:user} sent likes to the host',
  nickname: 'Maurice_chrisboemfamily',
  type: 'social',
  uniqueId: 'maurice_chrisboemfamily',
  text: 'followed the host',
};

const testTransformedGiftData = {
  text: {
    diamondsCount: 1,
    giftIcon:
      'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/eba3a9bb85c33e017f3648eaf88d7189~tplv-obj.png',
    repeatCount: 1,
    giftName: 'Rose',
  },
  uniqueId: 'maurice_chrisboemfamily',
  profilePictureUrl:
    'https://p77-sign-va-lite.tiktokcdn.com/tos-maliva-avt-0068/44bbd0876d5f10bcc093c43cd42e84f9~c5_100x100.webp?x-expires=1651539600&x-signature=eBQKW4npW1jxju9TOhSf1jnRW9M%3D',
};

const testData = [testLikeData, testFollowData, testTransformedGiftData];

const INSTRUCTIONS = {
  line1: 'Like / Follow -> Mention ',
  line2: 'Gift -> Profile Pic on Screen',
};

const ShowUserProfileScene = () => {
  const [message, setMessage] = useState('');
  const [idInput, setIdInput] = useState('discover_the_cosmos');
  const [stateText, setStateText] = useState('');
  const [connectedRoom, setConnectedRoom] = useState(false);
  const viewerCount = useRef(0);
  const [likeCount, setLikeCount] = useState(null);
  const [waitingList, setWaitingList] = useState(null);
  const diamondsCount = useRef(0);
  const ioConnectionRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const testRef = useRef(false);

  const connect = () => {
    if (idInput !== '') {
      ioConnectionRef.current.emit('setUniqueId', idInput, {
        enableExtendedGiftInfo: true,
      });
      setStateText('Connecting...');
    }
  };

  function onInitialized(state, reason) {
    if (state === ViroTrackingStateConstants.TRACKING_NORMAL) {
      setLoaded(true);
    } else if (state === ViroTrackingStateConstants.TRACKING_NONE) {
      // Handle loss of tracking
    }
  }

  const processTiktokEvent = async (data, mqMsg) => {
    setMessage(data);

    if (data.type === 'social' || data.type === 'like') {
      await asyncTimeout(200);
    } else if (data.type === 'gift') {
      await asyncTimeout(4000);
    } else {
    }

    setMessage('');
    setTimeout(() => {
      ioConnectionRef.current.emit('messageProcessed', mqMsg);
    }, 500);
  };

  useEffect(() => {
    setTimeout(() => {
      if (!connectedRoom) {
        connect();
      }
    }, 1000);
  }, []);

  // useEffect(() => {
  //   setInterval(() => {
  //     if (testRef.current) {
  //       setMessage('');
  //     } else {
  //       setMessage(testData[Math.floor(Math.random() * testData.length)]);
  //     }
  //     testRef.current = !testRef.current;
  //   }, 3000);
  // }, []);

  useEffect(() => {
    // const ioConnection = new io('http://localhost:3001', {jsonp: false});
    const ioConnection = new io(
      'https://tiktok-live-server-prod.herokuapp.com',
      {jsonp: false},
    );

    // On successful connection
    ioConnection.on('setUniqueIdSuccess', state => {
      // Reset stats
      viewerCount.current = 0;
      setLikeCount(0);
      diamondsCount.current = 0;
      setStateText(`Connected to roomId ${state.roomId}`);
      setConnectedRoom(true);
    });

    // On failed connection
    ioConnection.on('setUniqueIdFailed', errorMsg => {
      setStateText(errorMsg);
      setConnectedRoom(false);
    });

    // On stream ended
    ioConnection.on('streamEnd', () => {
      setStateText('Stream ended');
      setConnectedRoom(false);
    });

    // Viewer stats
    ioConnection.on('roomUser', msg => {
      if (typeof msg.viewerCount === 'number') {
        viewerCount.current = msg.viewerCount;
      }
    });

    ioConnection.on('join', async msg => {});

    // Waiting list
    ioConnection.on('waitingList', count => {
      setWaitingList(count);
    });

    // Like stats
    ioConnection.on('like', msg => {
      if (typeof msg.likeCount === 'number') {
      }

      if (typeof msg.totalLikeCount === 'number') {
        setLikeCount(msg.totalLikeCount);
      }
    });

    function isPendingStreak(data) {
      return data.gift?.gift_type === 1 && !data.gift?.repeat_end;
    }

    // Process tiktok event
    ioConnection.on('tiktokEvent', event => {
      let text = '';
      const {data, mqMsg} = event;

      switch (data.type) {
        case 'like':
          if (data.likeCount) {
            text = `sent likes x ${data.likeCount}`;
          }
          break;
        case 'social':
          text = data.label.replace('{0:user}', '');
          break;
        case 'gift':
          if (data.gift && data.extendedGiftInfo) {
            if (
              !isPendingStreak(data) &&
              data.extendedGiftInfo.diamond_count > 0
            ) {
              diamondsCount.current =
                data.extendedGiftInfo.diamond_count * data.gift.repeat_count;
              text = {
                repeatCount: data.gift.repeat_count,
                giftName: data.gift.giftName,
                diamondsCount: diamondsCount.current,
                giftIcon:
                  data.extendedGiftInfo.image.url_list[0] ||
                  data.extendedGiftInfo.icon.url_list[0],
              };
            }
          }
          break;
        default:
          return;
      }

      const modifiedData = {...data, text};
      processTiktokEvent(modifiedData, mqMsg);
    });

    // Get a list of all available gifts
    ioConnection.on('getAvailableGifts', data => {});

    // Chat messages
    ioConnection.on('chat', msg => {});
    // Gift
    ioConnection.on('gift', data => {});
    // Share, follow
    ioConnection.on('social', data => {});

    ioConnectionRef.current = ioConnection;
  }, []);

  return (
    <ViroARScene onTrackingUpdated={onInitialized}>
      <ViroAnimatedImage
        height={3.515}
        width={3.515}
        scale={[0.5, 0.5, 0]}
        position={[2.4, 1.6, -6.2]}
        rotation={[0, -20, 0]}
        style={styles.profileImg}
        animation={{name: 'spin', run: true, loop: true}}
        source={require('./public/images/computer.gif')}
      />
      <ViroImage
        height={4.515}
        width={4.515}
        scale={[0.5, 0.5, -3.5]}
        position={[0, -2.4, -5.2]}
        style={styles.profileImg}
        rotation={[0, 0, 0]}
        animation={{name: 'rotate', run: true, loop: true}}
        source={require('./public/images/smoking.png')}
      />
      <ViroAnimatedImage
        height={4.515}
        width={4.515}
        scale={[0.5, 0.5, -3.5]}
        position={[0, -4.1, -5.2]}
        style={styles.profileImg}
        source={require('./public/images/vibes.gif')}
      />
      <ViroAnimatedImage
        height={4.515}
        width={4.515}
        scale={[0.5, 0.5, -3]}
        position={[-8, 3.8, -10.2]}
        style={styles.profileImg}
        animation={{name: 'catFly', run: true, loop: true}}
        source={require('./public/images/cat_3.gif')}
      />
      <ViroAnimatedImage
        height={4.515}
        width={4.515}
        scale={[0.5, 0.5, 0]}
        position={[-4, 3.5, -5.6]}
        style={styles.profileImg}
        source={require('./public/images/ufo.gif')}
        animation={{name: 'fly', run: true, loop: true}}
      />
      <Viro3DObject
        source={require('./public/models/emoji/emoji_smile_anim_a.vrx')}
        position={[0, 2, -1]}
        scale={[0.4, 0.4, 0.4]}
        type="VRX"
        dragType="FixedDistance"
        onDrag={() => {
          console.log('dragging');
        }}
      />
      <ViroVideo
        height={8}
        width={8}
        source={require('./public/images/spicules_jets_on_the_sun.mp4')}
        loop={true}
        rotation={[0, 75, 0]}
        position={[-16, 2, -5]}
        scale={[1, 1.5, 1]}
      />
      {/* <ViroSound
        paused={false}
        muted={false}
        source={require('./public/music/track_1.mp3')}
        loop={true}
        volume={1.0}
      /> */}
      <ViroAmbientLight color={'#aaaaaa'} />
      <ViroSpotLight
        innerAngle={5}
        outerAngle={90}
        direction={[0, -1, -0.2]}
        position={[0, 3, 1]}
        color="#ffffff"
        castsShadow={true}
      />
      <ViroImage
        height={0.6}
        width={1.55}
        position={[0, 1, -1.6]}
        rotation={[30, 0, 0]}
        style={styles.profileImg}
        source={require('./public/images/frame.png')}
      />
      <ViroText
        text={INSTRUCTIONS.line1}
        width={6}
        scale={[0.2, 0.2, 0.2]}
        position={[0.08, 1.05, -1.6]}
        rotation={[30, 0, 0]}
        style={styles.instructions}
      />
      <ViroText
        text={INSTRUCTIONS.line2}
        width={6}
        scale={[0.2, 0.2, 0.2]}
        position={[0.08, 0.9, -1.6]}
        rotation={[30, 0, 0]}
        style={styles.instructions}
      />
      {loaded && (
        <ViroText
          text={stateText}
          scale={[0.5, 0.5, 0.5]}
          position={[0, 2.05, -1.6]}
          style={styles.instructions}
        />
      )}
      {message.text ? (
        <>
          {typeof message.text === 'string' ? (
            <>
              {message.type === 'like' && (
                <ViroAnimatedImage
                  height={0.6}
                  width={0.6}
                  position={[0, 0.22, -1.6]}
                  style={styles.profileImg}
                  source={require('./public/images/heart.gif')}
                />
              )}
              {message.type === 'social' && (
                <ViroAnimatedImage
                  height={0.6}
                  width={0.6}
                  position={[0, 0.26, -1.6]}
                  style={styles.profileImg}
                  source={require('./public/images/follow_2.gif')}
                />
              )}
              <ViroFlexView
                style={styles.messageBox}
                height={0.35}
                width={1.4}
                position={[0, -0.25, -1.6]}
              />
              <ViroText
                text={message.uniqueId}
                scale={[0.065, 0.065, 0.065]}
                position={[-0.1, -0.125, -0.9]}
                style={styles.username}
                height={1}
                width={5}
              />
              <ViroText
                text={message.text}
                scale={[0.065, 0.065, 0.065]}
                position={[-0.1, -0.175, -0.9]}
                style={styles.text}
                height={1}
                width={5}
              />
            </>
          ) : (
            <>
              {message.text.repeatCount ? (
                <>
                  <ViroAnimatedImage
                    height={3.815}
                    width={3.215}
                    scale={[0.5, 0.5, 0]}
                    position={[0, 0.95, -2]}
                    style={styles.profileImg}
                    source={require('./public/images/animated-heart.gif')}
                  />
                  <ViroImage
                    height={0.5}
                    width={0.5}
                    position={[0, 0.15, -1.6]}
                    style={styles.profileImg}
                    // source={message.profilePictureUrl}
                    source={require('./public/images/avatar.png')}
                  />
                  <ViroFlexView
                    style={styles.messageBox}
                    height={0.35}
                    width={1.4}
                    position={[0, -0.35, -1.6]}
                  />
                  <ViroText
                    text={message.uniqueId}
                    scale={[0.065, 0.065, 0.065]}
                    position={[-0.12, -0.175, -0.9]}
                    style={styles.username}
                    height={1}
                    width={5}
                  />
                  <ViroText
                    text={`sent ${message.text.giftName} x ${message.text.repeatCount}`}
                    scale={[0.065, 0.065, 0.065]}
                    position={[-0.12, -0.225, -0.9]}
                    style={styles.text}
                    height={1}
                    width={5}
                  />
                  {/* <ViroImage
                    height={0.02}
                    width={0.02}
                    position={[-0.12, -0.225, -0.9]}
                    style={styles.profileImg}
                    source={message.text.giftIcon}
                  /> */}
                  {/* <ViroText
                    // text={`x ${message.text.repeatCount} (${message.text.diamondsCount} x diamonds)`}
                    text={`x ${message.text.repeatCount}`}
                    scale={[0.06, 0.06, 0.06]}
                    position={[0.1, -0.225, -0.9]}
                    style={styles.text}
                    height={1}
                    width={6}
                  /> */}
                </>
              ) : null}
            </>
          )}
        </>
      ) : null}
    </ViroARScene>
  );
};

export default () => {
  return (
    <ViroARSceneNavigator
      autofocus={true}
      initialScene={{
        scene: ShowUserProfileScene,
      }}
      style={styles.f1}
    />
  );
};

var styles = StyleSheet.create({
  f1: {flex: 1},
  instructions: {
    fontSize: 40,
    color: 'gold',
    fontWeight: 'bold',
  },
  username: {
    fontSize: 50,
    color: 'orange',
    fontWeight: 'bold',
  },
  text: {
    fontSize: 50,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileImg: {
    // borderRadius: 50,
  },
  messageBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
});

ViroAnimations.registerAnimations({
  rotateLeft: {
    properties: {
      opacity: 1.0,
      rotateY: '+=45',
    },
    duration: 2500,
  },
  rotateRight: {
    properties: {
      opacity: 1.0,
      rotateY: '-=45',
    },
    duration: 2500,
  },
  rotate: [['rotateLeft', 'rotateRight']],
  spin: {
    properties: {
      rotateZ: '+=45',
    },
    duration: 2500,
  },
  flyRight: {
    properties: {
      opacity: 1.0,
      positionX: '+=8',
    },
    easing: 'Bounce',
    duration: 5000,
  },
  flyDown: {
    properties: {
      opacity: 1.0,
      positionY: '-=4.5',
    },
    easing: 'Bounce',
    duration: 5000,
  },
  flyLeft: {
    properties: {
      opacity: 1.0,
      positionX: '-=8',
    },
    easing: 'Bounce',
    duration: 5000,
  },
  flyUp: {
    properties: {
      opacity: 1.0,
      positionY: '+=4.5',
    },
    easing: 'Bounce',
    duration: 5000,
  },
  fly: [['flyRight', 'flyDown', 'flyLeft', 'flyUp']],
  flyRightCat: {
    properties: {
      positionX: '+=5',
    },
    easing: 'EaseInEaseOut',
    duration: 5000,
  },
  flyDownCat: {
    properties: {
      positionY: '-=2',
    },
    duration: 1000,
  },
  flyLeftCat: {
    properties: {
      positionX: '-=5',
    },
    easing: 'EaseInEaseOut',
    duration: 5000,
  },
  flyUpCat: {
    properties: {
      positionY: '+=2',
    },
    duration: 1000,
  },
  rotateRightCat: {
    properties: {
      rotateZ: '+=90',
    },
    duration: 1000,
  },
  rotateLeftCat: {
    properties: {
      rotateZ: '-=90',
    },
    duration: 1000,
  },
  catFly: [
    [
      'flyRightCat',
      'rotateRightCat',
      'flyDownCat',
      'rotateLeftCat',
      'flyLeftCat',
      'rotateLeftCat',
      'flyUpCat',
      'rotateLeftCat',
    ],
  ],
  profileImg: {
    properties: {
      opacity: 1,
    },
    easing: 'Bounce',
    duration: 1000,
  },
});
