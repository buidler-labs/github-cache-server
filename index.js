const express = require('express');
const oFs = require('fs');
const fs = require('fs/promises');
const fsE = require("fs-extra");
const server = express();
const PORT = process.env.PORT || 8080;
const CACHE_BASE_PATH = process.env.CACHE_BASE_PATH || 'cache';

let inboundCaches = {};

fsE.mkdirpSync(CACHE_BASE_PATH);

server.use(express.json());
server.use(express.raw({
    type: 'application/octet-stream',
    limit: '50mb'
}));

server.use((req, res, next) => {
    if (req.get('Authorization') !== `Bearer ${process.env.AUTH_KEY}` &&
        !req.originalUrl.startsWith("/_apis/artifactcache/cache/download/")) {
        res.status(401).json({message: 'You are not authorized'});
    } else {
        next();
    }
})

// Get cache entry
server.get('/_apis/artifactcache/cache', async (req, res, next) => {
    // TODO: what happens if multiple keys are provided?
    const { keys, version } = req.query;
    const baseURL = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
    const cacheId = `${keys}_${version}`;
    const cacheLocation = `${CACHE_BASE_PATH}/${cacheId}`;
    let archiveLocation = "";

    try {
        await fs.access(cacheLocation, oFs.constants.F_OK);
        archiveLocation = `${baseURL}/_apis/artifactcache/cache/download/${cacheId}`;
    } catch(e) { /* No-op */ }
    res.status(200).json({archiveLocation, cacheKey: keys});
});

// Download cache
server.get('/_apis/artifactcache/cache/download/:cacheId', (req, res, next) => {
    const { cacheId } = req.params;
    const file = `${__dirname}/${CACHE_BASE_PATH}/${cacheId}`;
    
    res.download(file);
});

// Reserve cache
server.post('/_apis/artifactcache/caches', async (req, res, next) => {
    const { key, version, cacheSize } = req.body;
    const cacheId = `${key}_${version}`;
    const cacheLocation = `${CACHE_BASE_PATH}/${cacheId}`;
    const fh = await fs.open(cacheLocation, 'w');

    inboundCaches[cacheId] = { fh };
    res.status(200).json({ cacheId });
});

// Save cache
server.patch('/_apis/artifactcache/caches/:cacheId', async (req, res, next) => {
    const { cacheId } = req.params;
    const contentRange = req.headers['content-range'];
    const [ _, startIndex, endIndex ] = /(\d+)-(\d+)/g.exec(contentRange);

    await inboundCaches[cacheId].fh.write(req.body, 0, req.body.length, +startIndex);    
    res.status(200).end();
});

// Commit cache
server.post('/_apis/artifactcache/caches/:cacheId', (req, res, next) => {
    const { cacheId } = req.params;
    const { size } = req.body;

    // TODO: make use of provided size
    inboundCaches[cacheId].fh.close();
    delete inboundCaches[cacheId];
    res.status(200).end();
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Listening on port ${PORT}`);
});