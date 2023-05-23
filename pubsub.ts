import PubNub from "pubnub"
import config from "./config"
import Blockchain from "./src/blockchain"
import CHANNELS from "./utils/channel"

class PubSub {
  pubnub: PubNub
  blockchain: Blockchain

  constructor({ blockchain }: { blockchain: Blockchain }) {
    this.blockchain = blockchain
    this.pubnub = new PubNub({
      publishKey: config.PUBLISH_KEY,
      subscribeKey: config.SUBSCRIBE_KEY,
      secretKey: config.SECRET_KEY,
      userId: config.USER_ID,
    })

    this.pubnub.subscribe({
      channels: Object.values(CHANNELS),
    })

    this.pubnub.addListener(this.listener())
  }

  listener(): PubNub.ListenerParameters {
    return {
      message: (messageData) => {
        const { channel, message } = messageData

        const parsedMessage = JSON.parse(message)

        if (channel === CHANNELS.BLOCKCHAIN) {
          this.blockchain.replaceChain(parsedMessage)
        }

        console.log(`message: ${message}, on channel ${channel}`)
      },
    }
  }

  publish({ channel, message }: PubNub.PublishParameters) {
    this.pubnub.publish({
      channel,
      message,
    })
  }

  broadcastChain() {
    this.pubnub.publish({
      channel: CHANNELS.BLOCKCHAIN,
      message: JSON.stringify(this.blockchain.chain),
      
    })
  }
}

export default PubSub
