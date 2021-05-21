import homestead from './mainnet.json';
import kovan from './kovan.json';
import bsc from './bsc.json';

interface Connector {
    id: string;
    name: string;
    options: any;
}

export interface AssetMetadata {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    logoURI: string | undefined;
}

interface Config {
    network: string;
    chainId: number;
    precision: number;
    infuraKey: string;
    alchemyKey: string;
    subgraphUrl: string;
    subgraphBackupUrl: string;
    addresses: {
        bFactory: string;
        bActions: string;
        dsProxyRegistry: string;
        exchangeProxy: string;
        weth: string;
        multicall: string;
    };
    assets: Record<string, AssetMetadata>;
    untrusted: string[];
    connectors: Record<string, Connector>;
    urls?: {
        mainnet: string | undefined;
        kovan: string | undefined;
        bsc: string | undefined;
    };
}

const configs = {
    1: {
        untrusted: [],
        ...homestead,
    },
    42:{
        untrusted: [],
        ...kovan,
    },
    56:{
        untrusted: [],
        ...bsc,
    },
};
// eslint-disable-next-line no-undef
const network = process.env.APP_CHAIN_ID || 42;

const config: Config = configs[network];
config.urls = {
    mainnet: process.env.VUE_APP_MAINNET_URL,
    kovan: process.env.VUE_APP_KOVAN_URL,
    bsc: process.env.VUE_APP_BSC_URL,
};

export default config;
