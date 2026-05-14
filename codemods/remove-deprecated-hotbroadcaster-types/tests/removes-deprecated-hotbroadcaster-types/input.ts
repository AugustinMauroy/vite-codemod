import type {
  HMRBroadcaster,
  HMRBroadcasterClient,
  HMRChannel,
  ServerHMRChannel,
} from 'vite'

type Channels = HMRChannel[]

interface RuntimeApi {
  broadcaster: HMRBroadcaster
  client: HMRBroadcasterClient
  serverChannel: ServerHMRChannel
}

export type HotTypes = Channels | RuntimeApi
