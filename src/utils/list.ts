import tokenlist from '@multitoken/assets/assets/tokens.json';

import config, { AssetMetadata } from '@/config';

const ETH_LOGO = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png';

export interface TokenList {
    name: string;
    logoURI?: string;
    tokens: Token[];
}

interface Token {
    address: string;
    chainId: number;
    name: string;
    symbol: string;
    decimals: number;
    logoURI?: string;
}

const poolTokens = new Set([
    '0x266a9aac60b0211d7269dd8b0e792d645d2923e6',
    '0x8b8cfa2f2411839c7c29089913a9734637a26383',
    '0x8c4c3c9b503700431b25840f26cef3896774e913',
    '0x7f0af1a00aa20dd127019ddb79957c6270068b64',
    '0x74a2affdbb8caf17f5ca650bc9303a559ac24b24',
    '0xfd74354313b7a8cfc59f779f6ba5b0053e75a16b',
    '0x6412578d9eb222964bb5fcf2eeb0f7aee09fe629',
    '0x6a86df5759f86e4d69a474c90f4089be2da87950',
    '0xa98e1c95890f03723662cbf0809eeb17d7d5b346',
    '0x5bba5f0046836c43164b75c5148a3a4253479355',
    '0xc33bdb953b982f7c3010f908fef32d0b251d6b29',
    '0x7dad0d1c1a012b8ab5f7c2fb93469440726fe7e5',
    '0x643f466dde4f53fe3948606ff64155cc02decce0',
    '0xc9e5545a6cc902598573b81569cf634962681099',
    '0xc175c8994a738616255e1a8ba6278d9341199994',
    '0x019137bd6a9a9b2a6d0bfa302e48cd6b2db5086d',
    '0x53f3efcf31bf3227d8ad65ade5197cc8852e99da',
    '0x22bf885bf1c9cc6a12d66929a8c22cc95acfb5cd',
    '0x010db7b4054d29a628a64493e49364b70a7a2a66',
    '0xec2e1ef466d53d16e70dee0b0bcbc7020f8e58c5',
    '0x266a9aac60b0211d7269dd8b0e792d645d2923e6',
    '0x8b8cfa2f2411839c7c29089913a9734637a26383',
    '0x8c4c3c9b503700431b25840f26cef3896774e913',
    '0x7f0af1a00aa20dd127019ddb79957c6270068b64',
    '0x74a2affdbb8caf17f5ca650bc9303a559ac24b24',
    '0xfd74354313b7a8cfc59f779f6ba5b0053e75a16b',
    '0x6412578d9eb222964bb5fcf2eeb0f7aee09fe629',
    '0x6a86df5759f86e4d69a474c90f4089be2da87950',
    '0xa98e1c95890f03723662cbf0809eeb17d7d5b346',
    '0x5bba5f0046836c43164b75c5148a3a4253479355',
    '0xc33bdb953b982f7c3010f908fef32d0b251d6b29',
    '0x7dad0d1c1a012b8ab5f7c2fb93469440726fe7e5',
    '0x643f466dde4f53fe3948606ff64155cc02decce0',
    '0xc9e5545a6cc902598573b81569cf634962681099',
    '0xc175c8994a738616255e1a8ba6278d9341199994',
    '0x019137bd6a9a9b2a6d0bfa302e48cd6b2db5086d',
    '0x53f3efcf31bf3227d8ad65ade5197cc8852e99da',
    '0x22bf885bf1c9cc6a12d66929a8c22cc95acfb5cd',
]);

export const DEFAULT_LIST = 'balancer';

export const listMetadata: Record<string, string> = {
    [DEFAULT_LIST]: '',
    '1inch': 'http://tokens.1inch.eth.link',
    'coingecko': 'https://tokens.coingecko.com/uniswap/all.json',
    'compound': 'https://raw.githubusercontent.com/compound-finance/token-list/master/compound.tokenlist.json',
    'zapper': 'https://zapper.fi/api/token-list',
    'zerion': 'http://tokenlist.zerion.eth.link',
};

export async function getTokenlist(id: string): Promise<TokenList> {
    if (id === DEFAULT_LIST) {
        tokenlist.tokens = tokenlist.tokens.filter(t => t.chainId != 42 || poolTokens.has(t.address.toLocaleLowerCase()));
        return tokenlist;
    }
    const listUrl = listMetadata[id];
    const response = await fetch(listUrl);
    const json = await response.json();
    return json;
}

export function getAssetsFromTokenlist(chainId: number, list: TokenList): Record<string, AssetMetadata> {
    const assets: Record<string, AssetMetadata> = {};
    if (list.tokens.findIndex(token => token.address === config.addresses.weth) !== -1) {
        assets.ether = {
            address: 'ether',
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
            logoURI: ETH_LOGO,
        };
    }
    for (const token of list.tokens) {
        if (token.chainId !== chainId) {
            continue;
        }
        assets[token.address] = {
            address: token.address,
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals,
            logoURI: token.logoURI,
        };
    }
    return assets;
}
