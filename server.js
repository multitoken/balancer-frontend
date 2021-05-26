var path = require('path');
var express = require('express');
const https = require('https');
const GARAPH_PATH = '/subgraphs/name/cron-md/multitoken';
const QUERY = "query { pools (where: {active: true, tokensCount_gt: 1, finalized: true, tokensList_not: []}, first: 20, skip: 0, orderBy: \"liquidity\", orderDirection: \"desc\") { id publicSwap finalized crp rights swapFee totalWeight totalShares totalSwapVolume liquidity tokensList swapsCount tokens (orderBy: \"denormWeight\", orderDirection: \"desc\") { id address balance decimals symbol denormWeight } swaps (first: 1, orderBy: \"timestamp\", orderDirection: \"desc\", where: {timestamp_lt: 1618488000}) { poolTotalSwapVolume } } }";
const NOT_FINALIZED_QUERY = "query { pools (where: {active: true, tokensCount_gt: 1, tokensList_not: []}, first: 20, skip: 0, orderBy: \"liquidity\", orderDirection: \"desc\") { id publicSwap finalized crp rights swapFee totalWeight totalShares totalSwapVolume liquidity tokensList swapsCount tokens (orderBy: \"denormWeight\", orderDirection: \"desc\") { id address balance decimals symbol denormWeight } swaps (first: 1, orderBy: \"timestamp\", orderDirection: \"desc\", where: {timestamp_lt: 1618488000}) { poolTotalSwapVolume } } }";

const excludedPoolsIds = [
    '0x1e7967bfab4c2050d15707136fbb2812476f0cfb',
    '0x03544dc2d0900bcef3bc09969e3ed5044ab2c802',
    '0xbc3b9572eb9065d9f53d93c2d2c612626a07a4a0',
    '0x755130d13d6846f9fae864d004c56e633c88b9e4',
    '0xffe8899b19c625bd19dbc5f00f9fe897b00f4973',
    '0xfadc0cd8b0fd00c9717e46e3e87c1f861334d526',
    '0xf6ec55a7c31ea21d68c248b058ab2421285ec005',
    '0xdc1fc4c2794cb60bc3d51e5feef8bc1f9f7dce6f',
    '0xd24f60a348b1eea428cc696fb64ba9c0dbe04e41',
    '0xd236eb3cd2be4284c71dbf86a5804e9e97af93c1',
    '0x19f3d186d89addc92cc000f8994a89b428a230e6',
    '0x0099c6f24f77c0ab440a59357d5bb24753d992c3',
    '0x720ea1e156642c7f39e14d86ef4b0d5acb1895b3',
];

var app = express();

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', req.get('Origin') || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
    res.header('Access-Control-Expose-Headers', 'Content-Length');
    res.header('Access-Control-Allow-Headers', 'Accept, Authorization, Content-Type, X-Requested-With, Range');
    if (req.method === 'OPTIONS') {
      return res.send(200);
    } else {
      return next();
    }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.set('port', process.env.PORT || 8080);


function queryGraph(query) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            "query": query
        });
        
        const options = {
            hostname: 'api.thegraph.com',
            port: 443,
            path: GARAPH_PATH,

            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': data.length,
              'Accept': 'application/json',
    
            }
        };
        
        const treq = https.request(options, tres => {
          const chunks = [];
        
          tres.on('data', d => {
            chunks.push(Buffer.from(d));
          })
          tres.on('end', () => {
              let data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
              // resolve(JSON.stringify(data['data']));
              resolve(data['data']);
          })
        })
        
        treq.on('error', error => {
          console.error(error);
        })
        
        treq.write(data);
        treq.end();
    });
}

function filterPools(data) {
    if (!data.pools) {
        return data;
    }

    return {
        pools: data.pools.filter(p => { return !(p.id && excludedPoolsIds.indexOf(p.id) >= 0)})
    }
}

app.get('/pools', (req, res) => {
    queryGraph(QUERY).then((data) => {
        res.end(JSON.stringify(filterPools(data)));
    });
});

app.get('/not-finalizesd-pools', (req, res) => {
    queryGraph(NOT_FINALIZED_QUERY).then((data) => {
        res.end(JSON.stringify(filterPools(data)));
    });
});

var server = app.listen(app.get('port'), function() {
  console.log('listening on port ', server.address().port);
});
