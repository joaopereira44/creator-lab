import test from 'node:test';
import assert from 'node:assert/strict';
import {classify,checkProvider,setJevProvider} from '../lib/providers.mjs';
const transcript={text:'Most people get this wrong. Here is the one change that doubled my reach in a week.',segments:[]};
// Answers every question with its first criterion, echoing the requested model.
const answer=req=>Response.json({model:req.model,answers:Object.fromEntries(Object.entries(req.questions).map(([k,q])=>[k,{type:q.type,choice:Object.keys(q.criteria)[0],confidence:.9,probabilities:{[Object.keys(q.criteria)[0]]:1}}])),usage:{input_tokens:1000,output_tokens:0}});
async function capture(provider,fn){const old=global.fetch,calls=[];global.fetch=async(url,opts={})=>{calls.push({url:String(url),opts});return String(url).endsWith('/systemone')?answer(JSON.parse(opts.body)):Response.json({data:[]});};setJevProvider(provider);try{await fn();}finally{global.fetch=old;setJevProvider('typesafe');}return calls;}
test('vercel provider routes Jev through AI Gateway with the gateway model id',async()=>{
 const calls=await capture('vercel',async()=>{const r=await classify(transcript,'gw-key');assert.equal(r.model,'typesafe-ai/jev');assert.equal((await checkProvider('jev','gw-key')).verified,true);});
 assert.equal(calls[0].url,'https://ai-gateway.vercel.sh/typesafe/v1/systemone');assert.equal(JSON.parse(calls[0].opts.body).model,'typesafe-ai/jev');assert.equal(calls[0].opts.headers.Authorization,'Bearer gw-key');
 assert.equal(calls[1].url,'https://ai-gateway.vercel.sh/typesafe/v1/models');
});
test('typesafe provider keeps the direct endpoint and pinned model',async()=>{
 const calls=await capture('typesafe',()=>classify(transcript,'ts-key'));
 assert.equal(calls[0].url,'https://api.typesafe.ai/v1/systemone');assert.notEqual(JSON.parse(calls[0].opts.body).model,'typesafe-ai/jev');
});
test('unknown JEV_PROVIDER fails loudly',()=>{assert.throws(()=>setJevProvider('openrouter'),/Unknown JEV_PROVIDER/);});
