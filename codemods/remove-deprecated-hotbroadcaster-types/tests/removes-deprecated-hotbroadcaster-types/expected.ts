
type Channels = any[];

interface RuntimeApi {
	broadcaster: any;
	client: any;
	serverChannel: any;
}

export type HotTypes = Channels | RuntimeApi;
