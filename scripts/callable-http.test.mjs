import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {once} from 'node:events';
import {checkCallable} from './check-callable.mjs';

// Only call OPTIONS and unauthenticated handlers, using the real Firebase SDK
// middleware. This local test needs neither Firebase credentials nor live data.
process.env.FIREBASE_CONFIG=JSON.stringify({projectId:'demo-pulse',databaseURL:'https://demo-pulse.firebaseio.com'});
const require=createRequire(new URL('../functions/package.json',import.meta.url));
const express=require('express'),handlers=require('./index.js');
test('deployed-style callable preflight and auth contract',async t=>{
  const app=express();app.use(express.json());app.all('/createEmployee',handlers.createEmployee);
  const server=app.listen(0,'127.0.0.1');t.after(()=>new Promise(resolve=>server.close(resolve)));
  await once(server,'listening');const url=`http://127.0.0.1:${server.address().port}/createEmployee`;
  await checkCallable(url);
  const response=await fetch(url,{method:'OPTIONS',headers:{Origin:'https://unlisted.example','Access-Control-Request-Method':'POST'}});
  assert.equal(response.headers.get('access-control-allow-origin'),null);
});
