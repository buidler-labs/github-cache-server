require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');
const {totalist} = require('totalist/sync');
const server = express();
const PORT = process.env.PORT || 8080;

server.use(bodyParser.json());
server.use(bodyParser.raw({
    type: 'application/octet-stream',
    limit: '50mb'
}))

server.use((req, res, next) => {
    if (req.get('Authorization') !== `Bearer ${process.env.AUTH_KEY}` &&
        !req.originalUrl.startsWith("/_apis/artifactcache/cache/download/")) {
        res.status(401).json({message: 'You are not authorized'});
    } else {
        next();
    }
})

server.get('/', (req, res) => {
    res.status(200).send({
        status: 'success'
    })
})

server.post('/_apis/pipelines/workflows/:runId/artifacts', (req, res) => {
    const {runId} = req.params;
    const baseURL = `${req.protocol}://${req.get('host')}${req.baseUrl}`;

    res.json({fileContainerResourceUrl: `${baseURL}/upload/${runId}`});
});

server.patch('/_apis/pipelines/workflows/:runId/artifacts', (req, res) => {
    const {runId} = req.params;

    res.status(200).json({message: 'success'});
});

server.get('/_apis/pipelines/workflows/:runId/artifacts', (req, res) => {
    const {runId} = req.params;
    const artifacts = new Set();
   const baseURL = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
    totalist(`./${runId}`, (name, abs, stats) => {
        name = name.replace('\\', '/');
        const fileDetails = {
            name: name.split('/')[0],
            fileContainerResourceUrl: `${baseURL}/download/${runId}`
        }
        artifacts.add(fileDetails);
    });
    console.log(artifacts);
    res.status(200).json({count: artifacts.count, value: [...artifacts]});
});

server.get('/download/:container', (req, res) => {
    const {container} = req.params;
    const baseURL = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
    const files = new Set();
    totalist(container, (name, abs, stats) => {
        console.log(name);
        console.log(abs);
        files.add({
            path: path.normalize(name),
            itemType: 'file',
            contentLocation: `${baseURL}/download/${container}/${name.replace('\\', '/')}`
        });
    })
    res.status(200).json({value: [...files]})
});

server.get('/download/:container/:path(*)', (req, res) => {
    const path = `${req.params.container}/${req.params.path}`;
    fs.createReadStream(path, {encoding: 'utf-8'}).pipe(res);
});

server.put('/upload/:runId', (req, res, next) => {
    const { itemPath } = req.query;
    const {runId} = req.params;
    req.setEncoding('base64');
    fs.ensureFileSync(`${runId}/${itemPath}`);
    fs.writeFile(`${runId}/${path.normalize(itemPath)}`, req.body, {encoding: 'utf-8'}, (err) => {
        if (err) {
            console.error(err);
        }
        res.status(200).json({message: 'success'})
    });
});

server.get('/_apis/artifactcache/cache', (req, res, next) => {
    const { keys, version } = req.query;
    const baseURL = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
    // TODO: what happens if multiple keys are provided?
    const cacheLocation = `${keys}_${version}`;
    const archiveLocation = fs.existsSync(cacheLocation) ? `${baseURL}/_apis/artifactcache/cache/download/${cacheLocation}` : "";

    res.status(200).json({archiveLocation});
});

server.get('/_apis/artifactcache/cache/download/:cacheId', (req, res, next) => {
    const { cacheId } = req.params;
    const file = `${__dirname}/${cacheId}`;
    
    res.sendFile(file);
});

server.post('/_apis/artifactcache/caches', (req, res, next) => {
    const { key, version, cacheSize } = req.body;

    res.status(200).json({cacheId: `${key}_${version}`});
});

server.patch('/_apis/artifactcache/caches/:cacheId', (req, res, next) => {
    const { cacheId } = req.params;
    fs.writeFile(`${cacheId}`, req.body, {encoding: 'utf-8'}, (err) => {
        if (err) {
            console.error(err);
        }
        res.status(200).json({message: 'success'})
    });
    // res.status(200).json({cacheId: `${key}_${version}`});
});

server.post('/_apis/artifactcache/caches/:cacheId', (req, res, next) => {
    const { size } = req.body;
    res.status(200).end();
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Listening on port ${PORT}`);
});