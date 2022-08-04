## Github Cache Server
... a working [Github Actions](https://docs.github.com/en/actions) [`actions/cache`](https://github.com/actions/cache) compatible emulation solution with out-of-the-box on-disk persistance and minimum authorization security support.

> This work is inspired from [`anthonykawa/artifact-server`](https://github.com/anthonykawa/artifact-server)'s excellent reverse engineering efforts applied now for caching instead.

### Running it
``` bash
$ npm i
$ AUTH_KEY=github-local-cache npm start
```
This will start the server itself and await cache requests.

Then you'll need to point your [act runner](https://github.com/nektos/act) to something like this:
```bash
$ act \
  -e ACTIONS_CACHE_URL=http://host.docker.internal:8080/
  -e ACTIONS_RUNTIME_URL=http://host.docker.internal:8080/
  -e ACTIONS_RUNTIME_TOKEN=github-local-cache
  ...
```
or, better yet, just make a `.actrc` file with:
```
--env ACTIONS_CACHE_URL=http://host.docker.internal:8080/
--env ACTIONS_RUNTIME_URL=http://host.docker.internal:8080/
--env ACTIONS_RUNTIME_TOKEN=github-local-cache
```

P.S: Don't forget to wire-up your `actions/cache` with the chosen token. Whatever that might be.