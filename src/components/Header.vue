<template>
    <div class="header">
        <div class="header-left">
            <router-link
                class="brand"
                :to="'/'"
            >
                <Icon
                    class="logo"
                    :title="'brand'"
                />
                <span class="title">Multitoken V1</span>
                <span class="alpha-warning">Alpha</span>
            </router-link>
            <a
                v-if="isDev"
                :href="commitLink"
                target="_blank"
                class="commit-label"
            >
                <div>
                    #{{ commitLabel }}
                </div>
            </a>
            <div class="page-links">
                <div
                    class="link active"
                >
                    Trade
                </div>
                <a
                    class="link"
                    href="https://etfs.multitoken.com/"
                    target="_blank"
                >
                    ETFs
                </a>
            </div>
        </div>
        <div class="network-container">
            <Button
                v-for="(chain, i) in chains"
                :key="i"
                :primary="chainParams[chain].chainId == `0x${config.chainId.toString(16)}`"
                :non-clickable="true"
                class="network-button"
                @click="test(chain)"
                v-text="chainParams[chain].chainName"
            />
        </div>
        <div class="header-right">
            <Icon
                class="mode-icon"
                :title="modeLogo"
                @click="toggleMode"
            />
            <Account class="account" />
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';

import Storage from '@/utils/storage';

import Account from '@/components/Account.vue';
import Button from '@/components/Button.vue';
import Icon from '@/components/Icon.vue';
import config from '@/config';
import provider from '@/utils/provider';
import chainParams from '@/utils/chainParams.json';
import { useStore } from 'vuex';
import { RootState } from '@/store';

export default defineComponent({
    components: {
        Account,
        Button,
        Icon,
    },
    setup() {
        const store = useStore<RootState>();
        // eslint-disable-next-line no-undef
        const isDev = ref(process.env.APP_ENV === 'dev');
        // eslint-disable-next-line no-undef
        const commit = ref(process.env.APP_COMMIT || '');
        const commitLabel = computed(() => commit.value.substr(0, 6));
        const commitLink = computed(() => 
            `https://github.com/multitoken/balancer-frontend/commit/${commit.value}`,
        );

        const chains = ['mainnet', 'kovan', 'bsc'];

        const mode = ref(Storage.isDarkmode());
        const modeLogo = computed(() => getLogo(mode.value));
        const walletChain = window.ethereum.chainId;

        function toggleMode(): void {
            mode.value = Storage.toggleMode();
            if (mode.value) {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        }

        function getLogo(isDarkmode: boolean): string {
            return isDarkmode ? 'moon' : 'sun';
        }
        
        function test(chainName: string): void {
            if (chainName === 'mainnet' || chainName === 'bsc') {
                store.dispatch('ui/notify', {
                    text: 'Coming soon',
                    type: 'info',
                });
            }
            return;
        }

        return {
            config,

            isDev,
            commitLabel,
            commitLink,
            chainParams,

            chains,

            modeLogo,
            walletChain,

            toggleMode,
            provider,

            test,
        };
    },
});
</script>

<style scoped>
.header {
    height: 80px;
    box-sizing: border-box;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--background-primary);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
    border-bottom: 1px solid var(--border);
}

.header-left {
    display: flex;
    align-items: center;
}

.header-right {
    display: flex;
    align-items: center;
}

a {
    text-decoration: none;
    color: var(--text-primary);
}

.brand {
    margin-left: 20px;
    display: flex;
    align-items: center;
}

.logo {
    width: 50px;
}

.title {
    margin-left: 12px;
    font-size: var(--font-size-large);
}

.alpha-warning {
    position: relative;

    top: -10px;

    font-size: var(--font-size-small);
    color: #f00;
}

.commit-label {
    margin-left: 8px;
    font-size: var(--font-size-small);
    color: var(--text-secondary);
}

.page-links {
    display: flex;
    align-items: flex-end;
    margin-left: 48px;
}

.link {
    margin-right: 20px;
    color: var(--text-secondary);
    cursor: pointer;
}

.link.active {
    color: var(--text-primary);
}

.network-container {
    position: absolute;

    left: calc(50% - 135px);

    width: 270px;

    display: flex;
    justify-content: space-between;
    align-items: center;
}

.network-button {
    padding: 1px 10px;
}
.network-button:hover {
    transform: none !important;
}

.mode-icon {
    height: 24px;
    width: 24px;
    cursor: pointer;
}

.account {
    margin: 0 16px;
}
</style>
