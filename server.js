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
